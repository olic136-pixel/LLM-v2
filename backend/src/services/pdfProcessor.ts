import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface PDFProcessingResult {
  text: string;
  numPages: number;
  info?: any;
}

export class PDFProcessor {
  async extractText(filePath: string): Promise<PDFProcessingResult> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info,
      };
    } catch (error: any) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  async extractTextFromBuffer(buffer: Buffer): Promise<PDFProcessingResult> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info,
      };
    } catch (error: any) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }
}

export const pdfProcessor = new PDFProcessor();
