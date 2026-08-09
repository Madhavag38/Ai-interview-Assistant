const COMPANY_PROFILES = {
  Google: {
    name: "Google",
    style: "Deep Algorithms & Scalable System Design",
    focusAreas: ["Data Structures & Algorithms", "Time & Space Complexity", "Scalability", "Clean Code"],
    promptInstruction: "Act as a Google L5 Senior Software Engineer. Focus heavily on optimal complexity, edge cases, scalability, and precise architectural trade-offs.",
    hiringBar: 85,
  },
  Amazon: {
    name: "Amazon",
    style: "Leadership Principles & High Scale Systems",
    focusAreas: ["Customer Obsession", "Ownership", "System Architecture", "Operational Excellence"],
    promptInstruction: "Act as an Amazon Software Development Manager. Evaluate technical depth AND alignment with Amazon Leadership Principles (Customer Obsession, Bias for Action, Dive Deep).",
    hiringBar: 80,
  },
  Microsoft: {
    name: "Microsoft",
    style: "Object-Oriented Design & Pragmatic Engineering",
    focusAreas: ["Design Patterns", "Robust Code", "Problem Solving", "Collaboration"],
    promptInstruction: "Act as a Microsoft Principal Engineer. Focus on clean OOP design patterns, maintainability, robust error handling, and pragmatic engineering trade-offs.",
    hiringBar: 80,
  },
  TCS: {
    name: "TCS",
    style: "CS Fundamentals & Logical Reasoning",
    focusAreas: ["Java/C++ Core", "SQL Queries", "Data Structures", "Communication"],
    promptInstruction: "Act as a TCS Senior Technical Lead. Ask foundational CS questions on OOP, SQL queries, basic data structures, and logical reasoning.",
    hiringBar: 65,
  },
  Infosys: {
    name: "Infosys",
    style: "Problem Solving & Core Technical Depth",
    focusAreas: ["DBMS & SQL", "Web Fundamentals", "Aptitude", "Coding Logic"],
    promptInstruction: "Act as an Infosys Technical Evaluator. Assess core programming concepts, database management, and structured problem-solving.",
    hiringBar: 65,
  },
  Startup: {
    name: "High-Growth Startup",
    style: "Full Stack Execution & Practical Frameworks",
    focusAreas: ["React/Node.js Practical API Design", "Database Modeling", "Delivery Speed", "Debugging"],
    promptInstruction: "Act as a Startup CTO. Focus on practical full-stack execution, framework expertise, speed of delivery, and real-world system architecture.",
    hiringBar: 75,
  },
};

module.exports = COMPANY_PROFILES;
