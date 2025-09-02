"use client";

import { useState, useEffect } from "react";
import axios from "axios";

//  structure for the instruction data
type TargetInfo = {
  emailAddress: string;
  subject: string;
};

//  structure for the final analysis data
type AnalysisResult = {
  receivingChain: string[];
  esp: string;
  createdAt: string;
};

export default function HomePage() {
  const [targetInfo, setTargetInfo] = useState<TargetInfo | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  useEffect(() => {
    const fetchTargetInfo = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/email/target-info"
        );
        setTargetInfo(response.data);
        setIsChecking(true);
      } catch (err) {
        console.error("Failed to fetch target info:", err);
        setError(
          "Could not connect to the backend. Please ensure it is running."
        );
      }
    };
    fetchTargetInfo();
  }, []);

  // This effect runs to automatically check for results every 5 seconds.
  useEffect(() => {
    if (!isChecking || !targetInfo?.subject) return;

    // Sets up an interval to call the results API.
    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/email/results/${targetInfo.subject}`
        );

        if (response.status === 200) {
          setResults(response.data);
          setIsChecking(false);
        }
      } catch (err) {
        console.log("Automatic Check: Results not ready yet.");
      }
    }, 5000); // Checks every 5 seconds.

    return () => clearInterval(intervalId);
  }, [isChecking, targetInfo?.subject]);

  const createTestData = async () => {
    setIsCreatingTest(true);
    try {
      await axios.get("http://localhost:3001/email/create-test-data");
      // Trigger a check for results
      if (targetInfo?.subject) {
        const response = await axios.get(
          `http://localhost:3001/email/results/${targetInfo.subject}`
        );
        setResults(response.data);
        setIsChecking(false);
      }
    } catch (err) {
      console.error("Failed to create test data:", err);
    } finally {
      setIsCreatingTest(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-50 text-gray-800">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
          Email Analyzer
        </h1>
        <p className="text-center text-gray-500 mb-12">
          Follow the instructions below to analyze an email's delivery path.
        </p>

        {/* Instructions Card */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
          {error && (
            <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
          )}
          {!targetInfo && !error && <p>Loading instructions...</p>}
          {targetInfo && (
            <div className="space-y-4">
              <p>1. Open your email client (e.g., Gmail, Outlook).</p>
              <div>
                <p>2. Send an email to this address:</p>
                <code className="block bg-gray-100 p-3 rounded-md mt-1 text-blue-600 font-mono break-all">
                  {targetInfo.emailAddress}
                </code>
              </div>
              <div>
                <p>3. Use this exact subject line:</p>
                <code className="block bg-gray-100 p-3 rounded-md mt-1 text-blue-600 font-mono break-all">
                  {targetInfo.subject}
                </code>
              </div>
              <p>4. Once sent, the analysis results will appear below.</p>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>For Testing:</strong> Click the button below to create
                  sample analysis data
                </p>
                <button
                  onClick={createTestData}
                  disabled={isCreatingTest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingTest ? "Creating..." : "Create Test Data"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4">Analysis Results</h2>
          {isChecking && (
            <div className="flex items-center space-x-2 text-blue-600">
              <span className="animate-pulse">●</span>
              <span>Actively listening for the email...</span>
            </div>
          )}
          {results && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* ESP Type Display */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Sender's ESP
                </h3>
                <p className="text-3xl font-bold text-blue-900">
                  {results.esp}
                </p>
              </div>
              {/* Receiving Chain Display */}
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-3">
                  Receiving Chain (Timeline)
                </h3>
                <ol className="relative border-l border-gray-300 ml-2">
                  {results.receivingChain.map((hop, index) => (
                    <li key={index} className="mb-4 ml-4">
                      <div className="absolute w-3 h-3 bg-gray-400 rounded-full mt-1.5 -left-1.5 border border-white"></div>
                      <p className="text-sm font-semibold text-gray-700">
                        Hop {index + 1}
                      </p>
                      <code className="text-xs text-gray-600 block bg-gray-100 p-2 rounded-md mt-1 font-mono break-all">
                        {hop}
                      </code>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
