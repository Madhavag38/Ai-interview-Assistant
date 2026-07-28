## 🚀 Overview

**AI Interview Assistant** is a production-grade web application that helps candidates prepare for technical interviews through AI-powered mock interviews. The platform uses **Groq's LLaMA 3.3 70B model** for intelligent question generation and answer evaluation, with **voice support** for a realistic interview experience.

### 🎯 Why This Project?

- **Real-world problem**: 70% of candidates fail interviews due to lack of practice
- **AI-powered**: Uses state-of-the-art language models for evaluation
- **Voice-enabled**: Natural conversation flow with speech-to-text and text-to-speech
- **Proctored**: Prevents cheating with tab switching detection
- **Production-ready**: Built with security, scalability, and performance in mind

---

## ✨ Features

### 🎤 Voice-Enabled Interviews
- **Speech-to-Text**: Convert your voice to text using Whisper API
- **Text-to-Speech**: AI responses are read aloud using ElevenLabs
- **Natural Conversation**: Speak your answers like a real interview

### 🤖 AI-Powered Evaluation
- **Intelligent Feedback**: Detailed, actionable feedback on every answer
- **Multi-dimensional Scoring**: Technical accuracy, communication, completeness
- **Adaptive Questions**: Follow-up questions based on your responses

### 🛡️ Proctoring System
- **Tab Switching Detection**: Alerts when candidate switches tabs
- **Copy-Paste Prevention**: Blocks copying/pasting during interview
- **Right-Click Blocking**: Prevents context menu access
- **DevTools Detection**: Identifies developer tools usage

### 📄 Resume Analysis
- **AI Resume Parser**: Extracts skills, experience, and strengths
- **Domain Recommendations**: Suggests best-fit interview domains
- **Experience Level Detection**: Junior/Mid/Senior classification

### 📊 Performance Tracking
- **Score History**: Track your progress over time
- **Domain-wise Analysis**: Identify strengths and weaknesses
- **Detailed Feedback**: Understand how to improve

### 🔒 Security
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: DDoS protection on all endpoints
- **Input Validation**: XSS and NoSQL injection prevention
- **HTTP Security Headers**: Helmet.js protection

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 18+ | Runtime environment |
| Express.js | REST API framework |
| MongoDB | Primary database |
| Mongoose | ODM for MongoDB |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Groq AI | LLaMA 3.3 70B for evaluation |
| Whisper API | Speech-to-Text |
| ElevenLabs | Text-to-Speech |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Web Speech API | Browser voice support |
| Axios | HTTP client |