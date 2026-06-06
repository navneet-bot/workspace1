"use client";

import React, { useEffect, useState } from "react";
import mammoth from "mammoth";
import { Download, X, FileText, Loader2 } from "lucide-react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileData: string; // Can be base64 payload or complete Data URI
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function getCleanBase64(data: string): string {
  if (data.includes(",")) {
    return data.split(",")[1];
  }
  return data;
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  fileName,
  fileData,
}: DocumentPreviewModalProps) {
  const [docxHtml, setDocxHtml] = useState<string>("");
  const [txtContent, setTxtContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !fileData) return;

    const cleanBase64 = getCleanBase64(fileData);
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    const isDocx = fileName.toLowerCase().endsWith(".docx");
    const isTxt = fileName.toLowerCase().endsWith(".txt") || fileName.toLowerCase().endsWith(".csv");

    setDocxHtml("");
    setTxtContent("");
    setError("");
    setLoading(true);

    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl("");
    }

    try {
      if (isPdf) {
        const arrayBuffer = base64ToArrayBuffer(cleanBase64);
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        setLoading(false);
      } else if (isDocx) {
        const arrayBuffer = base64ToArrayBuffer(cleanBase64);
        mammoth
          .convertToHtml({ arrayBuffer })
          .then((result) => {
            setDocxHtml(result.value || "<p>Empty Document</p>");
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setError("Failed to parse Word document. Please download to view.");
            setLoading(false);
          });
      } else if (isTxt) {
        const binaryString = window.atob(cleanBase64);
        setTxtContent(binaryString);
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to decode file data. Please download the file.");
      setLoading(false);
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, fileData, fileName]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const cleanBase64 = getCleanBase64(fileData);
    const mime = getMimeType(fileName);
    const link = document.createElement("a");
    link.href = `data:${mime};base64,${cleanBase64}`;
    link.download = fileName;
    link.click();
  };

  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  const isDocx = fileName.toLowerCase().endsWith(".docx");
  const isTxt = fileName.toLowerCase().endsWith(".txt") || fileName.toLowerCase().endsWith(".csv");
  const isSupported = isPdf || isDocx || isTxt;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "95vw",
          maxWidth: "900px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <FileText className="text-jj-accent shrink-0" size={20} />
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--text)",
              }}
            >
              {fileName}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleDownload}
              className="action-btn action-approve"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              className="hover:bg-white/[0.05]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflow: "hidden",
            position: "relative",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "12px",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 className="animate-spin text-jj-accent" size={32} />
              <span style={{ fontSize: "14px" }}>Loading and rendering document...</span>
            </div>
          ) : error ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "16px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "40px" }}>⚠️</span>
              <div style={{ fontSize: "15px", color: "var(--red)", fontWeight: 500 }}>{error}</div>
              <button onClick={handleDownload} className="btn-sm btn-accent">
                Download File
              </button>
            </div>
          ) : !isSupported ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "16px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "40px" }}>📄</span>
              <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                Online preview is not available for this file format.
              </div>
              <button onClick={handleDownload} className="btn-sm btn-accent">
                Download to View
              </button>
            </div>
          ) : isPdf && pdfBlobUrl ? (
            <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "8px" }}>
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ border: "none" }}
              >
                <iframe
                  src={pdfBlobUrl}
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                  title="PDF Document Preview"
                >
                  <p style={{ padding: "20px", color: "var(--text-muted)" }}>
                    Your browser does not support inline PDFs.{" "}
                    <a href={pdfBlobUrl} download={fileName} style={{ color: "var(--accent)" }}>
                      Download the PDF
                    </a>{" "}
                    to view it.
                  </p>
                </iframe>
              </object>
            </div>
          ) : isDocx ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                overflowY: "auto",
                background: "#ffffff",
                color: "#1a1a1a",
                padding: "30px 40px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="docx-preview-rendered"
                style={{
                  fontFamily: "Georgia, serif",
                  lineHeight: "1.6",
                  fontSize: "15px",
                }}
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : isTxt ? (
            <pre
              style={{
                width: "100%",
                height: "100%",
                overflow: "auto",
                background: "var(--surface2)",
                color: "var(--text)",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                margin: 0,
                fontFamily: "monospace",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {txtContent}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
