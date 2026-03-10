#!/usr/bin/env python3
"""
PDF text extractor using pdfplumber.
Simple extraction - handles watermarked PDFs by reading text layer directly.
"""
import sys
import pdfplumber

def extract(pdf_path):
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text(x_tolerance=3, y_tolerance=3)
            if t:
                pages.append(t)
    return "\n\n".join(pages)

if __name__ == "__main__":
    print(extract(sys.argv[1]))

# #!/usr/bin/env python3
# """
# Two-column aware PDF extractor for Indian university transcripts.
# Uses pdfplumber layout mode to preserve spatial positioning, then
# auto-detects the column split from the header row.
# Outputs: LEFT_COURSE_CONTENT ||| RIGHT_COURSE_CONTENT
# """
# import sys, re
# import pdfplumber

# SEP = " ||| "

# def extract(pdf_path):
#     pages_text = []
#     with pdfplumber.open(pdf_path) as pdf:
#         for page in pdf.pages:
#             t = page.extract_text(layout=True, x_tolerance=3, y_tolerance=3)
#             if t:
#                 pages_text.append(t)
    
#     full_text = "\n".join(pages_text)
#     lines = full_text.split("\n")
    
#     # Auto-detect column split from the header row
#     # "Sem Subiect Name ... Grade Sem Subiect Name ... Grade"
#     split_col = None
#     for line in lines:
#         m = re.search(r'Grade\s+Sem\s', line)
#         if m:
#             split_col = m.start() + 6
#             break
    
#     if split_col is None:
#         # Fallback: find any line with two "Credit" or "Grade" occurrences
#         for line in lines:
#             if line.count("Credit") >= 2 or line.count("Grade") >= 2:
#                 mid = len(line) // 2
#                 split_col = mid
#                 break
    
#     if split_col is None:
#         # Last resort: just return plain text
#         return full_text
    
#     result = []
#     for line in lines:
#         left  = line[:split_col].strip()
#         right = line[split_col:].strip()
#         if left and right:
#             result.append(left + SEP + right)
#         elif left:
#             result.append(left)
#         elif right:
#             result.append(SEP + right)
    
#     return "\n".join(result)

# if __name__ == "__main__":
#     print(extract(sys.argv[1]))