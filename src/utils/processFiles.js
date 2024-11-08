const fs = require("fs").promises;
const path = require("path");

exports.processFile = (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, "utf8")
        .then((data) => {
          const questions = [];
          const lines = data.split("\n");
          let currentQuestion = null;
  
          lines.forEach((line) => {
            const trimmedLine = line.trim();
  
            if (trimmedLine.match(/^\d+\./)) {
              if (currentQuestion) {
                questions.push(currentQuestion);
              }
  
              const questionText = trimmedLine.replace(/^\d+\.\s*/, "");
              currentQuestion = { question: questionText, answers: [] };
            } else if (trimmedLine.startsWith("-")) {
              const isCorrect = trimmedLine.includes("*");
              const answerText = trimmedLine
                .replace(/^-+\s*/, "")
                .replace("*", "")
                .trim();
  
              if (currentQuestion) {
                currentQuestion.answers.push({ answer: answerText, isCorrect });
              }
            }
          });
  
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          resolve(questions);
        })
        .catch((err) => {
          console.error("Error al leer el archivo:", err);
          reject("Error al leer el archivo");
        });
    });
  };