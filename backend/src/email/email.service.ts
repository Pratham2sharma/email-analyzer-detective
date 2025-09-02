import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { Email, EmailDocument } from "./entities/email.entity";
import { HeaderValue, ParsedMail } from "mailparser";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const Imap = require("node-imap");
const { simpleParser } = require("mailparser");
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectModel(Email.name) private emailModel: Model<EmailDocument>,
    private readonly configService: ConfigService
  ) {}

  @Cron('*/10 * * * * *')
  public handleCron() {
    this.logger.debug("Running cron job to check for emails...");
    this.checkEmails();
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  private checkEmails(): void {
    const imapConfig = {
      user: this.configService.get<string>("IMAP_USER"),
      password: this.configService.get<string>("IMAP_PASSWORD"),
      host: this.configService.get<string>("IMAP_HOST"),
      port: this.configService.get<number>("IMAP_PORT"),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 60000,
      authTimeout: 5000,
      keepalive: false
    };

    this.logger.debug(`Connecting to IMAP: ${imapConfig.host}:${imapConfig.port} as ${imapConfig.user}`);

    const imapClient = new Imap(imapConfig);

    imapClient.once("ready", () => {
      imapClient.openBox("INBOX", false, (err: Error | null) => {
        if (err) {
          this.logger.error("Error opening inbox:", err);
          imapClient.end();
          return;
        }

        const targetSubject = this.configService.get("TARGET_SUBJECT");
        this.logger.debug(`Searching for emails with subject: ${targetSubject}`);
        
        imapClient.search(
          ["UNSEEN", ["SUBJECT", targetSubject]],
          (err: Error | null, results: unknown) => {
            if (err) {
              this.logger.error("Search error:", err.message);
              imapClient.end();
              return;
            }
            
            if (!results || (Array.isArray(results) && results.length === 0)) {
              this.logger.debug("No new emails found with the target subject.");
              imapClient.end();
              return;
            }
            
            this.logger.log(`Found ${Array.isArray(results) ? results.length : 1} new email(s)`);

            const f = imapClient.fetch(results, { 
              bodies: '',
              struct: true,
              envelope: true
            });

            f.on("message", (msg: any, seqno: number) => {
              this.logger.log("Processing new message...");

              msg.on("body", (stream: any) => {
                void simpleParser(
                  stream,
                  async (err: Error | null, parsed: ParsedMail) => {
                    if (err) {
                      this.logger.error("Error parsing email:", err);
                      return;
                    }

                    this.logger.debug('Processing email headers...');
                    this.logger.debug(`Headers keys: ${Array.from(parsed.headers.keys()).join(', ')}`);

                    const receivingChain = this.getReceivingChain(parsed.headers);
                    const esp = this.detectEsp(parsed.headers);
                    
                    this.logger.debug(`Receiving chain length: ${receivingChain.length}`);
                    this.logger.debug(`Detected ESP: ${esp}`);

                    const newAnalysis = new this.emailModel({
                      subject: parsed.subject ?? "No Subject",
                      receivingChain,
                      esp,
                    });
                    await newAnalysis.save();
                    this.logger.log(
                      `Saved analysis for email: ${
                        parsed.subject ?? "No Subject"
                      }`
                    );
                  }
                );
              });

              msg.once("end", () => {
                imapClient.addFlags(seqno, ["\\Seen"], (err: Error | null) => {
                  if (err)
                    this.logger.error("Error marking email as seen:", err);
                });
              });
            });

            f.once("error", (err: Error) => {
              this.logger.error("Fetch error: " + err.message);
            });

            f.once("end", () => {
              this.logger.log("Done fetching all messages!");
              imapClient.end();
            });
          }
        );
      });
    });

    imapClient.once("error", (err: Error) => {
      this.logger.error("IMAP connection error:", err.message);
      try {
        imapClient.end();
      } catch (e) {
        this.logger.error("Error closing IMAP connection:", e);
      }
    });

    imapClient.once("end", () => {
      this.logger.log("IMAP connection ended.");
    });

    imapClient.connect();
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  private getReceivingChain(headers: any): string[] {
    const receivedHeaders = headers.get ? headers.get('received') : headers['received'];
    
    if (Array.isArray(receivedHeaders)) {
      const chain = receivedHeaders.map(h => {
        if (typeof h === 'string') return h;
        if (typeof h === 'object' && h !== null) {
          return h.value || h.text || String(h);
        }
        return String(h);
      }).filter(Boolean);
      
      return chain.reverse();
    }
    
    if (typeof receivedHeaders === 'string') {
      return [receivedHeaders];
    }
    
    return [];
  }

  private detectEsp(headers: any): string {
    const getHeaderValue = (headerName: string): string => {
      const header = headers.get ? headers.get(headerName) : headers[headerName];
      if (Array.isArray(header) && header.length > 0) {
        const first = header[0];
        return typeof first === 'string' ? first : (first?.value || first?.text || String(first));
      }
      return typeof header === 'string' ? header : (header?.value || header?.text || '');
    };

    // Check various headers for ESP detection
    const authResults = getHeaderValue('authentication-results');
    const receivedSpf = getHeaderValue('received-spf');
    const returnPath = getHeaderValue('return-path');
    const messageId = getHeaderValue('message-id');
    const xOriginalSender = getHeaderValue('x-original-sender');
    const xSender = getHeaderValue('x-sender');
    
    // Combine all relevant headers for analysis
    const allHeaders = [authResults, receivedSpf, returnPath, messageId, xOriginalSender, xSender].join(' ').toLowerCase();
    
    // Check for Gmail/Google Workspace
    if (allHeaders.includes('google.com') || allHeaders.includes('gmail.com') || 
        allHeaders.includes('googlemail.com') || messageId.includes('@gmail.com')) {
      return 'Gmail / Google Workspace';
    }
    
    // Check for Outlook/Office 365
    if (allHeaders.includes('outlook.com') || allHeaders.includes('office365.com') || 
        allHeaders.includes('protection.outlook.com') || allHeaders.includes('hotmail.com') ||
        messageId.includes('@outlook.com') || messageId.includes('@hotmail.com')) {
      return 'Outlook / Office 365';
    }
    
    // Check for other ESPs
    if (allHeaders.includes('amazonses.com')) return 'Amazon SES';
    if (allHeaders.includes('zoho.com')) return 'Zoho Mail';
    if (allHeaders.includes('mail.ru')) return 'Mail.ru';
    if (allHeaders.includes('yahoo.com')) return 'Yahoo Mail';
    if (allHeaders.includes('sendgrid.net')) return 'SendGrid';
    if (allHeaders.includes('mailgun.org')) return 'Mailgun';
    
    // Check received headers for more clues
    const receivedHeaders = headers.get ? headers.get('received') : headers['received'];
    if (Array.isArray(receivedHeaders)) {
      const receivedText = receivedHeaders.map(h => {
        if (typeof h === 'string') return h;
        return h?.value || h?.text || String(h);
      }).join(' ').toLowerCase();
      
      if (receivedText.includes('google.com') || receivedText.includes('gmail.com')) {
        return 'Gmail / Google Workspace';
      }
      if (receivedText.includes('outlook.com') || receivedText.includes('protection.outlook.com')) {
        return 'Outlook / Office 365';
      }
    }
    
    return 'Unknown';
  }

  async findOneBySubject(subject: string): Promise<EmailDocument | null> {
    return this.emailModel.findOne({ subject }).sort({ createdAt: -1 }).exec();
  }

  getTargetInfo() {
    return {
      emailAddress: this.configService.get<string>('IMAP_USER'),
      subject: this.configService.get<string>('TARGET_SUBJECT'),
    };
  }

  async createTestAnalysis(): Promise<EmailDocument> {
    const testAnalysis = new this.emailModel({
      subject: this.configService.get<string>('TARGET_SUBJECT'),
      receivingChain: [
        'from mail-sor-f41.google.com (mail-sor-f41.google.com [209.85.220.41]) by mx.google.com',
        'from smtp.gmail.com (smtp.gmail.com [74.125.82.108]) by mail-sor-f41.google.com',
        'from [192.168.1.100] by smtp.gmail.com with ESMTPSA'
      ],
      esp: 'Gmail / Google Workspace',
    });
    return await testAnalysis.save();
  }
}
