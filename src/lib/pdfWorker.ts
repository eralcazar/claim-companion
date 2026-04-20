import { pdfjs } from "react-pdf";

// Configure pdf.js worker from CDN matching the installed version.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;