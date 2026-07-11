import re

files = [
    'frontend/src/pages/admin/MembershipQueue.tsx',
    'frontend/src/pages/admin/MembersList.tsx',
    'frontend/src/pages/admin/LoanQueue.tsx',
    'frontend/src/pages/admin/LoansList.tsx'
]

for fp in files:
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Just in case there is no newline
    c = re.sub(r'<table className="w-full text-sm text-left border-collapse"(?!\s*>)', '<table className="w-full text-sm text-left border-collapse">', c)
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)

print("Fixed tags")
