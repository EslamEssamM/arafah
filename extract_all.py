import fitz
import sys
import unicodedata
import os

def is_diacritic(char):
    category = unicodedata.category(char)
    if category.startswith('M'):
        return True
    try:
        name = unicodedata.name(char)
        if "LIGATURE SHADDA" in name or "LIGATURE FATHA" in name or "LIGATURE DAMMA" in name or "LIGATURE KASRA" in name:
            return True
        if name.startswith("ARABIC") and any(x in name for x in ["SHADDA", "FATHA", "DAMMA", "KASRA", "SUKUN", "MADDA", "TANWEEN", "FATHATAN", "DAMMATAN", "KASRATAN"]):
            if "LETTER" not in name and "LIGATURE" not in name:
                return True
    except ValueError:
        pass
    return False

def is_arabic_letter(char):
    if is_diacritic(char):
        return False
    try:
        name = unicodedata.name(char)
        return "ARABIC LETTER" in name or "ARABIC LIGATURE" in name
    except ValueError:
        return False

def reconstruct_page_text(page):
    raw_dict = page.get_text("rawdict")
    chars_info = []
    
    for block in raw_dict["blocks"]:
        if block["type"] == 0:  # Text block
            for line in block["lines"]:
                for span in line["spans"]:
                    for char in span["chars"]:
                        c = char["c"]
                        bbox = char["bbox"]
                        chars_info.append({
                            "char": c,
                            "x0": bbox[0],
                            "y0": bbox[1],
                            "x1": bbox[2],
                            "y1": bbox[3],
                            "cx": (bbox[0] + bbox[2]) / 2,
                            "cy": (bbox[1] + bbox[3]) / 2,
                            "is_mark": is_diacritic(c)
                        })
                        
    if not chars_info:
        return ""
        
    # Group characters into lines based on their vertical center (cy)
    chars_info.sort(key=lambda x: x["cy"])
    
    lines = []
    current_line = []
    current_cy = chars_info[0]["cy"]
    
    for char in chars_info:
        # 8.0 units threshold is standard for line grouping
        if abs(char["cy"] - current_cy) < 8.0:
            current_line.append(char)
        else:
            lines.append(current_line)
            current_line = [char]
            current_cy = char["cy"]
    if current_line:
        lines.append(current_line)
        
    reconstructed_lines = []
    for line in lines:
        base_letters = [c for c in line if not c["is_mark"]]
        diacritics = [c for c in line if c["is_mark"]]
        
        # Sort base letters by cx descending (right-to-left)
        base_letters.sort(key=lambda x: x["cx"], reverse=True)
        
        base_diacritics = {i: [] for i in range(len(base_letters))}
        arabic_letter_indices = [i for i, b in enumerate(base_letters) if is_arabic_letter(b["char"])]
        
        for d in diacritics:
            if not arabic_letter_indices:
                continue
            closest_idx = min(arabic_letter_indices, key=lambda i: abs(base_letters[i]["cx"] - d["cx"]))
            base_diacritics[closest_idx].append(d)
            
        line_chars = []
        for i, base in enumerate(base_letters):
            line_chars.append(base["char"])
            diac_list = base_diacritics[i]
            diac_list.sort(key=lambda x: 0 if x["char"] == '\u0651' else 1)
            for d in diac_list:
                line_chars.append(d["char"])
                
        line_text = "".join(line_chars)
        normalized_line = unicodedata.normalize('NFKC', line_text)
        
        # Clean up double spacing caused by split characters and spaces
        # Sometimes there's multiple spaces in sequence, collapse them to single space
        normalized_line = " ".join(normalized_line.split())
        
        reconstructed_lines.append(normalized_line)
        
    return "\n".join(reconstructed_lines)

def main():
    doc = fitz.open("arafah_prayers.pdf")
    print(f"Loaded arafah_prayers.pdf. Total pages: {len(doc)}")
    
    output_filename = "extracted_prayers.md"
    
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write("# أدعية يوم عرفة (مستخرجة من PDF)\n\n")
        f.write("هذا الملف يحتوي على نصوص الأدعية المستخرجة بدقة من ملف PDF المرفق، مرتبة صفحة بصفحة.\n\n")
        
        for page_idx in range(len(doc)):
            print(f"Processing page {page_idx + 1}/{len(doc)}...")
            page = doc[page_idx]
            page_text = reconstruct_page_text(page)
            
            f.write(f"## الصفحة {page_idx + 1}\n\n")
            f.write("```arabic\n")
            f.write(page_text)
            f.write("\n```\n\n")
            
    print(f"Extraction completed! Output saved to {output_filename}")

if __name__ == "__main__":
    main()
