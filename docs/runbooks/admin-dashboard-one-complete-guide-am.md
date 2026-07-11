# የAdmin Dashboard አንድ ሙሉ መመሪያ (እርምጃ-በ-እርምጃ)

ይህ ሰነድ ለሁሉም ሰራተኞች ብቻውን የሚበቃ መመሪያ ነው።

"ምን እፈልጋለሁ? የት እጫን?" በቀጥታ ያሳያል።

## 1) መጀመሪያ

### መግቢያ
1. የadmin portal login ገጽ ክፈት።
2. email እና password አስገባ።
3. Login ጫን።

### ዋና ስክሪን ክፍሎች
- የላይ ክፍል: ስም, role, branch, search, icons
- የግራ ሜኑ: የሚፈቀዱልህ ሁሉም modules
- የመሀል ክፍል: የሚሰሩበት ገጽ

### መውጫ
- የግራ ሜኑ (ከታች) -> Log Out

## 2) ፈጣን መመሪያ: "X ከፈለግክ Y ጫን"

## 2.1 የማመልከቻ Queue
- የmembership ማመልከቻ ከፈለግክ: Left menu -> Membership Queue
- የloan ማመልከቻ ከፈለግክ: Left menu -> Loan Queue
- የapproved members ከፈለግክ: Left menu -> Members List
- የapproved loans ከፈለግክ: Left menu -> Loans List

## 2.2 ወደ ዝርዝር መግባት (Details)
- Membership Queue ወይም Loan Queue ረድፍ -> Actions -> Eye icon

ይህ ወደ Application Detail ገጽ ይወስድሃል።

## 2.3 በApplication Detail ላይ
ከላይ ያሉ አዝራሮች:
- Request Info: የጎደለ መረጃ መጠየቅ
- Reassign: ጉዳይ ለሌላ ኦፊሰር መላክ (ፍቃድ ያለው ሚና ብቻ)
- Approve: መፍቀድ
- Reject: መከልከል

Tabs:
- Application: የአመልካች መረጃ
- Documents: ሰነዶች ግምገማ
- Notes: ውስጣዊ ማስታወሻ
- Timeline: የሁኔታ ታሪክ

## 2.4 የሰነድ እርምጃዎች
Application Detail -> Documents tab:
- ሰነድ ለማየት: Eye
- ለማውረድ: Download
- ሰነድ ለመፍቀድ: Approve
- ሰነድ ለመከልከል: Reject -> ምክንያት አስገባ

## 2.5 ማስታወሻ መጨመር
Application Detail -> Notes tab:
1. በAdd Note ሳጥን ላይ ጻፍ
2. Add Note ጫን

## 2.6 ሪፖርት እና ክትትል
- Left menu -> Reports
- filters ምረጥ (branch, role, product, timeframe)
- Refresh ጫን
- Export CSV ጫን
- schedule ለመፍጠር: recipients + frequency አስገባ -> save

## 2.7 ማሳወቂያ
- Left menu -> Notifications
- ከዝርዝር ውስጥ አንድ notification ምረጥ
- Retry: እንደገና መላክ
- Ack: ተቀባይነት መስጠት
- Reopen: ዳግም መክፈት

Templates:
- Notifications ገጽ -> template ክፍል -> create/edit -> Preview -> Save Template

## 2.8 Audit Log
- Left menu -> Audit Log
- Search ጠቀም
- Action እና Entity filters ጠቀም
- Export ጫን

## 2.9 User Management
- Left menu -> User Management

ዋና ተግባሮች:
- ተጠቃሚ መፍጠር: Add/New -> form -> save
- ተጠቃሚ ማስተካከል: Edit -> save
- ማጥፋት (deactivate): reason አስገባ
- password reset
- invite link መፍጠር
- bulk action ማስኬድ

## 2.10 Settings
- Left menu -> Settings

Settings tabs:
- System: loan threshold, assignment mode, compliance lock
- Branches: add/edit/delete branch
- Access Matrix: ለrole የmodule ፍቃድ ክፈት/ዝጋ -> Save Role Permissions

## 2.11 CMS
- Left menu -> CMS

ከዚህ የሚታዩ ክፍሎች:
- pages
- services
- loan products
- branches (public info)
- downloads
- news
- FAQ
- announcements

መደበኛ ፍሰት:
1. section ምረጥ
2. Add ወይም Edit ጫን
3. መረጃ/ፋይል አዘምን
4. save/publish

## 3) የዕለታዊ ስራ ፍሰት
1. Dashboard ክፈት
2. pending review እና pending documents ተመልከት
3. Membership Queue ወይም Loan Queue ክፈት
4. በbranch/status ፊልተር አድርግ
5. Eye icon በመጫን ዝርዝር ክፈት
6. Application + Documents አረጋግጥ
7. Request Info / Approve / Reject ውሳኔ ስጥ
8. Note ጻፍ

## 4) የሁኔታ ትርጉም
- DRAFT: ሙሉ አልተጠናቀቀም
- SUBMITTED: ተቀብሏል
- UNDER_REVIEW: በምርመራ ላይ
- KYC_VERIFICATION: የKYC ምርመራ
- PENDING_DOCUMENTS: ሰነድ እየተጠበቀ
- PENDING_CLARIFICATION: ማብራሪያ እየተጠበቀ
- APPROVED: ተፈቅዷል
- REJECTED: ተከልክሏል
- ACTIVATED: ተጠናቋል

## 5) በሚና የተለመዱ ስራዎች

### SUPER_ADMIN
- ሁሉንም modules
- users, settings, access matrix, reports, audit, CMS

### BRANCH_MANAGER
- dashboard, queues, reports, notifications, audit, settings
- reassignment እና ክትትል

### MEMBERSHIP_OFFICER
- Membership Queue, Members List
- የmembership ጉዳዮች ግምገማ

### LOAN_OFFICER
- Loan Queue, Loans List
- የloan ጉዳዮች ግምገማ

### KYC_OFFICER
- membership + loan የKYC እና ሰነድ ምርመራ

### CONTENT_ADMIN
- CMS እና Notifications

## 6) አስፈላጊ የደህንነት ህጎች
1. አስፈላጊ ሰነዶች ሳይረጋገጡ አትApprove።
2. ሁሉንም ዋና እርምጃ በNote አስመዝግብ።
3. Reject ሲደረግ ግልጽ ምክንያት አስገባ።
4. ካልተረጋገጠ ጉዳይ ካለ Request Info ወይም escalate አድርግ።

## 7) የቀን መጨረሻ ቼክሊስት
1. ያለ note የተጨመረ ጉዳይ አይቀር
2. ሁሉም reject ግልጽ ምክንያት ይኑረው
3. ከፍ ያለ age/SLA ጉዳይ ቀጣይ እርምጃ ይኑረው

## 8) ፈጣን መፍትሄ

### "ሜኑ አልታየልኝም"
- የrole ፍቃድ ጉዳይ ሊሆን ይችላል

### "Approve አይሰራም"
- ሰነዶች ተረጋግጠው እንደሆነ አረጋግጥ

### "Queue ባዶ ነው"
- filters አጽዳ
- refresh አድርግ

### "Error መልእክት አለ"
- refresh አድርግ
- error text + reference number + screenshot ከፍ አድርግ

---
ይህን ሰነድ እንደ ዋና የቀን-ተቀን መመሪያ ይጠቀሙ።
