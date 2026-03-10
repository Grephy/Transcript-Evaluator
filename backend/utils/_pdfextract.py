import pdfplumber, sys
with pdfplumber.open(sys.argv[1]) as pdf:
    text = ''
    for page in pdf.pages:
        t = page.extract_text()
        if t: text += t + '\n\n'
    print(text)
