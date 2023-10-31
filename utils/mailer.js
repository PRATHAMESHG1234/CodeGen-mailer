const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const Student = require("../models/Students");
const FileLink = require("../models/FileLink");
const connectDB = require("./db");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prathameshghorpade933@gmail.com",
    pass: "tzyqzqhbyzukodoi",
  },
});
let specificId = 1;
async function sendDailyEmails() {
  try {
    const users = await Student.find();

    // Send emails to users with PDF and ZIP attachments
    for (const user of users) {
      const { name, email } = user;

      // Check if student's email is valid
      if (!email) {
        throw new Error(`Invalid email for student: ${name}`);
      }

      const pdfLink = await FileLink.findOne({
        fileId: specificId,
      }); // Fetch pdf links of current day for the user

      const zipLink = await FileLink.findOne({
        fileId: specificId === 1 ? specificId : specificId - 1,
      }); // Fetch zip links of the previous day for the user

      if (pdfLink && zipLink) {
        const { pdfUrl } = pdfLink;
        const { zipUrl } = zipLink;

        // Check if PDF and ZIP files exist
        if (pdfUrl && zipUrl) {
          const message = {
            from: "prathameshghorpade933@gmail.com",
            to: email,
            subject: `Daily Flash ${specificId}`,
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #f2f2f2; padding: 20px;">
              <h2 style="color: #333;">Hello, ${name}!</h2>
                <p style="color: #333;">We have prepared new study materials for you:</p>
                <ul style="color: #333; margin-left: 20px;">
                  <li><strong>New Questions PDF:</strong><a href=${pdfUrl} >  (Attached: NewQuestions_${specificId}.pdf)</a></li>
                  ${
                    specificId !== 1
                      ? `<li><strong>Previous Day's Question Answers ZIP:</strong><a href=${zipUrl} > (Attached: PreviousAnswers_${
                          specificId - 1
                        }.zip)</a></li>`
                      : ""
                  }
                </ul>
                <p style="color: #333;">Study well and have a great day!</p>
                <div style="margin-top: 20px; text-align: center; background-color: #ffffff; padding: 10px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                  <p style="color: #333; margin: 0;">Best Regards,</p>
                  <p style="color: #007bff; margin: 5px 0;">Your School Name</p>
                </div>
              </div>
            `,
          };

          await transporter.sendMail(message); // Send email to the user
          specificId++; // Send email to the user
        } else {
          throw new Error("PDF or ZIP file not found!");
        }
      } else {
        throw new Error("PDF or ZIP link not found!");
      }
    }
    specificId++;
  } catch (error) {
    console.error("Error sending emails: ", error);
  }
}

module.exports = { sendDailyEmails };
