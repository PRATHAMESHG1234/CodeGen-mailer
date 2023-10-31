const express = require("express");
const Multer = require("multer");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Firebase Admin SDK Service Account Key
const connectDB = require("./utils/db");
const FileLink = require("./models/FileLink");
const { sendDailyEmails } = require("./utils/mailer");
const ExcelJS = require("exceljs");

const app = express();
const port = 3000;

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://codegen-mailer.appspot.com",
});

const bucket = admin.storage().bucket();
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

connectDB();

app.use(express.json());

app.post(
  "/uploadfiles",
  multer.fields([{ name: "pdf" }, { name: "zip" }]),
  async (req, res) => {
    try {
      const pdfFile = req.files["pdf"][0];
      const zipFile = req.files["zip"][0];

      const [pdfUrl, zipUrl] = await Promise.all([
        uploadFileToFirebaseStorage(pdfFile),
        uploadFileToFirebaseStorage(zipFile),
      ]);

      // Store the PDF and ZIP URLs in MongoDB
      const lastRecord = await FileLink.findOne().sort({ fileId: -1 });

      // Calculate the new fileId (previous fileId + 1)
      const newFileId = lastRecord ? lastRecord.fileId + 1 : 1;

      // Store the PDF and ZIP URLs in MongoDB with the new fileId
      const fileLink = new FileLink({
        fileId: newFileId,
        pdfUrl: pdfUrl[0],
        zipUrl: zipUrl[0],
      });

      await fileLink.save();

      res.json({ pdfUrl: pdfUrl[0], zipUrl: zipUrl[0] });
    } catch (error) {
      console.error("Error: ", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.post("/uploadStudent", async (req, res) => {
  try {
    const { path } = req.body;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);

    const worksheet = workbook.getWorksheet(1);

    const data = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        // Skip header row
        const rowData = {
          name: row.getCell(1).value,
          mobile: row.getCell(2).value,
          email: row.getCell(3).value,
          batch: row.getCell(4).value,
        };
        data.push(rowData);
      }
    });

    await Student.insertMany(data);

    res.status(200).json({ message: "Data added to MongoDB successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function uploadFileToFirebaseStorage(file) {
  try {
    const fileBuffer = file.buffer;
    const fileName = `${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    return fileUpload.getSignedUrl({
      action: "read",
      expires: "01-01-2500",
    });
  } catch (error) {
    console.error("Error uploading file to Firebase Storage: ", error);
    throw error;
  }
}
const mailer = async () => {
  await sendDailyEmails();

  // Set the interval to run the function every day ( 24 * 60 * 60 * 1000 milliseconds)
  setInterval(() => sendDailyEmails(), 24 * 60 * 60 * 1000);
};
mailer();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
