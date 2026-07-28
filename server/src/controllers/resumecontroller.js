/**
 * Resume Controller
 * Fixed version with proper PDF parsing
 */

const Groq = require("groq-sdk");
const pdfParse = require("pdf-parse");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const DOMAINS = [
    "JavaScript/Node.js",
    "React",
    "Python",
    "Data Science",
    "DevOps",
    "System Design",
    "Database Design",
    "General",
];

/**
 * Extract text from PDF buffer using pdf-parse
 */
async function extractTextFromPDF(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error("PDF parsing error:", error);
        throw new Error("Failed to parse PDF file");
    }
}

/**
 * Analyze resume using Groq AI
 */
const analyzeResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: "No file uploaded" 
            });
        }

        let resumeText;

        // Extract text based on file type
        if (req.file.mimetype === "application/pdf") {
            const parsed = await extractTextFromPDF(req.file.buffer);
            resumeText = parsed || "No text extracted from PDF.";
        } else {
            // For text files
            resumeText = req.file.buffer.toString("utf-8");
        }

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({ 
                success: false,
                error: "Failed to extract sufficient text from resume" 
            });
        }

        // Truncate to avoid token limits
        const truncated = resumeText.slice(0, 6000);

        const prompt = `
You are an expert technical recruiter and career coach.
Analyze the following resume and respond ONLY with a valid JSON object. No text outside JSON.

Available interview domains: ${DOMAINS.join(", ")}

Resume text:
"""
${truncated}
"""

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence professional summary of the candidate",
  "experienceLevel": "Junior" | "Mid" | "Senior",
  "skillsDetected": ["skill1", "skill2", "skill3", ...],
  "strengths": ["strength1", "strength2", "strength3"],
  "recommendedDomains": [
    {
      "label": "exact domain name from the available list",
      "reason": "one sentence why this domain fits them",
      "confidence": 85
    }
  ]
}

Rules:
- experienceLevel must be exactly "Junior", "Mid", or "Senior"
- skillsDetected: list up to 12 actual skills found in the resume
- strengths: list 3 specific professional strengths
- recommendedDomains: recommend 3 domains ordered by best fit, confidence is 0-100
- domain label must exactly match one from the available domains list
- confidence scores should be realistic and different for each domain
`.trim();

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const raw = response.choices[0].message.content || "{}";
        let analysis;

        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (error) {
            console.error("JSON parsing error:", error);
            return res.status(500).json({ 
                success: false,
                error: "Failed to parse analysis result" 
            });
        }

        // Filter valid domains
        if (analysis && analysis.recommendedDomains) {
            analysis.recommendedDomains = analysis.recommendedDomains.filter(
                d => DOMAINS.includes(d.label)
            );
        }

        res.json({ 
            success: true,
            analysis 
        });

    } catch (error) {
        console.error("Error analyzing resume:", error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error",
            message: error.message 
        });
    }
};

module.exports = {
    analyzeResume,
};