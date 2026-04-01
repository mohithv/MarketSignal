export async function analyzeWithClaude(prompt: string): Promise<string> {
  throw new Error(
    'Claude provider is disabled in this build. Configure Groq instead and call analyzeWithGroq.'
  );
}
