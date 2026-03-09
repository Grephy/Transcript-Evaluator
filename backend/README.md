# TranscriptIQ Backend

Backend API for processing and extracting data from transcripts using OCR and file parsing.

## Features

- **PDF Processing**: Extract text from PDF documents
- **Image OCR**: Tesseract-based OCR for images (JPG, PNG)
- **CSV/Excel Parsing**: Parse structured transcript data
- **Text Extraction**: Parse plain text transcripts
- **University Detection**: Identify Indian universities from transcript text
- **Course Extraction**: Extract course codes, titles, grades, and credits

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

## Running the Server

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### 1. Upload and Process Transcript
**POST** `/api/upload`

Upload a transcript file (PDF, image, CSV, Excel, or TXT) and get extracted data.

**Request:**
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@transcript.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "transcript.pdf",
    "university": "IIT Bombay",
    "courses": [
      {
        "code": "CS301",
        "title": "Data Structures",
        "grade": "87%",
        "credits": 4
      }
    ],
    "stats": {
      "totalCourses": 6,
      "totalCredits": 18,
      "averageGrade": "86.5"
    }
  }
}
```

### 2. Parse Raw Text
**POST** `/api/parse-text`

Parse transcript text without file upload.

**Request:**
```json
{
  "text": "CS301 Data Structures 87% 4..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "university": "Unknown University",
    "courses": [...],
    "stats": {...}
  }
}
```

### 3. Health Check
**GET** `/api/health`

```bash
curl http://localhost:5000/api/health
```

## Supported File Types

- **PDF**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`
- **Spreadsheets**: `.csv`, `.xlsx`, `.xls`
- **Text**: `.txt`

## How It Works

### PDF Processing
1. Uses `pdfjs-dist` to extract text from PDFs
2. Parses extracted text for course information

### Image Processing
1. Uses `tesseract.js` for OCR (Optical Character Recognition)
2. Converts images to PNG format for better OCR accuracy
3. Extracts text from the processed image

### CSV/Excel Processing
1. Uses `xlsx` for Excel files
2. Uses `papaparse` for CSV files
3. Converts tabular data to structured course format

### Text Parsing
1. Uses regex patterns to identify courses
2. Extracts: course code, title, grade, credits
3. Validates and structures the data

### University Detection
Recognizes these Indian universities:
- IIT Bombay
- Delhi University
- VTU
- Anna University
- Mumbai University
- JNTU
- Pune University
- Osmania University

## Course Extraction Patterns

The parser recognizes various transcript formats:

**Pattern 1:** `CODE TITLE GRADE CREDITS`
```
CS301 Data Structures 87% 4
```

**Pattern 2:** `CODE - TITLE - GRADE - CREDITS`
```
CS301 - Data Structures - 87% - 4
```

**Pattern 3:** `CODE | TITLE | GRADE | CREDITS`
```
CS301 | Data Structures | 87% | 4
```

## Troubleshooting

### OCR Not Working
- Ensure Tesseract is properly installed
- Check image quality (higher DPI = better results)
- Try converting JPG to PNG format

### File Upload Errors
- Check file size (max 50MB)
- Verify file format is supported
- Check disk space in `./uploads` directory

### PDF Extraction Issues
- Ensure PDF is text-based (not scanned image)
- Check PDF isn't encrypted
- Try re-exporting PDF from original source

## Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **cors**: Cross-Origin Resource Sharing
- **tesseract.js**: OCR for images
- **pdfjs-dist**: PDF text extraction
- **xlsx**: Excel file parsing
- **papaparse**: CSV parsing
- **sharp**: Image processing

## Next Steps

Connect this backend to the React frontend in `../react-app`:

```javascript
// In React component
const response = await fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  body: formData
});
```

## License

MIT
