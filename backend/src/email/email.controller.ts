import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

@Controller("email")
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {}

  @Get("target-info")
  getTargetInfo() {
    return {
      emailAddress: this.configService.get<string>("IMAP_USER"),
      subject: this.configService.get<string>("TARGET_SUBJECT"),
    };
  }

  @Get("results/:subject")
  async findResultBySubject(@Param("subject") subject: string) {
    const result = await this.emailService.findOneBySubject(subject);
    if (!result) {
      throw new NotFoundException(
        `Analysis for subject "${subject}" not found yet. Please wait or try again.`
      );
    }
    return result;
  }

  @Get("create-test-data")
  async createTestData() {
    const result = await this.emailService.createTestAnalysis();
    return { message: "Test data created successfully", data: result };
  }

  @Get("check-emails")
  async manualCheckEmails() {
    this.emailService.handleCron();
    return { message: "Email check triggered manually" };
  }
}
