# የደንበኛ ስርዓት አስረካቢ ሰነድ እና የኦፕሬሽን ሽግግር

## 1. የሰነድ መረጃ
- የሰነድ ርዕስ: የደንበኛ ስርዓት አስረካቢ ሰነድ እና የኦፕሬሽን ሽግግር
- የፕሮጀክት ስም: Zemen Digital Trust Platform
- የሰነድ መለያ: ZDT-HO-2026-001-AM
- ቅጂ: 1.1
- ቀን: 2026-04-18
- ደረጃ: ለደንበኛ ብቻ (Confidential)
- ያዘጋጀው: Handover and Delivery Team
- የገለጸው: Project Technical Lead
- ያፀደቀው: Program Owner

## 2. የሚስጥር ማስታወቂያ
ይህ ሰነድ የፕሮጀክቱን ቴክኒክ እና ኦፕሬሽናል መረጃ ይዟል። በፈቃድ ያልተፈቀደ ሰው ላይ መክፈት፣ መቅዳት ወይም ማሰራጨት አይፈቀድም።

## 3. የማስረከቢያ መግለጫ
የአፈፃፀም ቡድኑ በዚህ ሰነድ ውስጥ የተጠቀሱት የስርዓት ክፍሎች ለደንበኛው ኦፕሬሽናል ባለቤትነት መርከባቸውን ያረጋግጣል።

## 4. የተረከበ ክልል

### 4.1 የንግድ ክልል
- የህዝብ ድረ-ገጽ እና መረጃ ገፆች
- የአባልነት ዲጂታል ማመልከቻ
- የብድር ዲጂታል ማመልከቻ
- የማመልከቻ ሁኔታ ክትትል
- የአድሚን ኦፕሬሽን ዳሽቦርድ
- የኮንቴንት አስተዳደር
- ሪፖርት እና ክትትል
- ማሳወቂያ እና ግንኙነት ሂደት
- ኦዲት እና ኮምፕላይንስ እይታ

### 4.2 ቴክኒክ ክልል
- frontend web application
- backend API services
- database schema እና migrations
- deployment artifacts እና scripts
- runbooks እና training documents

## 5. የሚና እና የመዳረሻ ሽግግር
የተዘጋጁ የአድሚን ሚናዎች:
- SUPER_ADMIN
- BRANCH_MANAGER
- MEMBERSHIP_OFFICER
- LOAN_OFFICER
- KYC_OFFICER
- CONTENT_ADMIN

የመዳረሻ መዋቅር:
- RBAC (Role-Based Access Control)
- በmodule ደረጃ ፍቃድ ቁጥጥር
- በቅርንጫፍ የተገደበ መዳረሻ (ከሚፈለግ)

ደንበኛው ከዚህ በኋላ ዝቅተኛ ፍቃድ ፖሊሲን ማስተግበር እና መደበኛ እይታ ማድረግ ይጠበቅበታል።

## 6. የኦፕሬሽን ችሎታ ሽግግር
ደንበኛው አሁን የሚፈጽማቸው:
- የአባልነት እና የብድር ሂደቶችን ከመጀመሪያ እስከ መጨረሻ
- ሰነድ ማረጋገጥ እና ግምገማ
- ፈቃድ/ክልክል ውሳኔ ከaudit trace ጋር
- ስራ መመደብ እና እንደገና መመደብ
- ተጠቃሚ፣ ቅርንጫፍ እና ፍቃድ አስተዳደር
- የህዝብ ይዘት ማዘመን
- ሪፖርት እና ኦፕሬሽን ክትትል
- የaudit log ግምገማ

## 7. የደህንነት እና ቁጥጥር መሠረት
የተሰጡ መቆጣጠሪያዎች:
- የተረጋገጠ የadmin መግቢያ
- በrole እና module የፍቃድ ምርመራ
- የaudit event መቅጃ
- የabuse/security ክትትል እይታ
- የworkflow ታሪክ

ከhandover በኋላ የደንበኛ ኃላፊነቶች:
- የcredentials እና secrets አስተዳደር
- የመዳረሻ አስተዳደር
- የbackup እና restore ማረጋገጫ
- የincident ምላሽ አዋቂነት

## 8. ኢንቫይሮንመንት እና ኮንፊግ ባለቤትነት
ደንበኛው የሚያስተዳድረው:
- production config values
- secrets መቀየር እና መጠበቅ
- hosting/infrastructure settings
- release approvals እና deployment windows

## 9. የውሂብ ባለቤትነት እና ቀጣይነት
የደንበኛ ኃላፊነት:
- መደበኛ database backup
- retention policy
- restore test መፈተሽ
- የውሂብ ኮምፕላይንስ ፖሊሲ

ዝቅተኛ ምክር:
- ዕለታዊ backup
- የrestore እርምጃ ሰነድ
- ወርሃዊ restore drill

## 10. የተሰጠ ሰነድ ፓኬጅ
- master handover
- branded template
- executive summary
- admin user guides
- bilingual guide
- trainer pack እና assessment checklist

## 11. የድጋፍ እና የማሳወቂያ መዋቅር
የተመከረ ደረጃ:
- L1: የቅርንጫፍ ድጋፍ
- L2: የፕላትፎርም አስተዳዳሪ
- L3: የቴክኒክ ድጋፍ ቡድን

ማሳወቂያ ሲደርስ የሚካተቱ መረጃዎች:
- ቀን/ሰዓት
- role እና branch
- ተጎዳ module
- reference number
- error message
- screenshot/log

## 12. የተቀባይነት መስፈርቶች
- [ ] ተጠቃሚዎች ተፈጥረው ተረጋግጠዋል
- [ ] የrole ፍቃዶች ተገምግመው ተፈቅደዋል
- [ ] የbranch setup ተጠናቋል
- [ ] ዋና workflow ሙከራ ተደርጓል
- [ ] reporting/export ተረጋግጧል
- [ ] notifications/routing ተረጋግጧል
- [ ] audit logs ተገምግመዋል
- [ ] CMS publishing ተፈትሿል
- [ ] backup/restore ኃላፊነት ተቀባይነት አግኝቷል
- [ ] support matrix ተጠናቋል

## 13. ቀሪ አደጋዎች እና ግምቶች
ግምቶች:
- ደንበኛው የsecret አስተዳደር ፖሊሲ ይከተላል
- የrole governance ይተገበራል
- የbackup/restore ሙከራ ይካሄዳል

ካልተጠበቀ:
- የፍቃድ ስህተት
- ኦፕሬሽናል ችግኝ መዘግየት
- የrecovery አደጋ

## 14. የዋስትና እና የአገልግሎት ወሰን (Template)
- የዋስትና ጊዜ: በተፈረመው የአገልግሎት ስምምነት መሰረት
- የሚሸፈኑ ችግኝ አይነቶች: በተረከበው ክልል ውስጥ የdeployment እና configuration ችግኝ
- የማይሸፈኑ ክፍሎች: የሶስተኛ ወገን አገልግሎት መቋረጥ እና በደንበኛ ያልተፈቀደ ለውጥ
- የመመለሻ SLA: በclient support agreement መሰረት
- የመፍትሄ SLA: በseverity ደረጃ እና በsupport tier መሰረት

## 15. የባለቤትነት ሽግግር ቀን
የኦፕሬሽናል ባለቤትነት ሽግግር ቀን: 2026-04-18 (ወይም በደንበኛ የተፈቀደ ቀን)

## 16. ፊርማ እና ተቀባይነት

### 16.1 የአፈፃፀም ቡድን
- ስም: Handover and Delivery Team Representative
- ስራ መደብ: Implementation Lead
- ፊርማ:
- ቀን:

### 16.2 የደንበኛ ቴክኒክ ባለቤት
- ስም: Client Technical Owner
- ስራ መደብ: Technical Operations Lead
- ፊርማ:
- ቀን:

### 16.3 የደንበኛ የንግድ ባለቤት
- ስም: Client Business Owner
- ስራ መደብ: Operations/Business Sponsor
- ፊርማ:
- ቀን:

## 17. Annex A - የማጣቀሻ ሰነዶች
- docs/runbooks/client-system-handover-master.md
- docs/runbooks/client-system-handover-branded-template.md
- docs/runbooks/client-system-handover-executive-summary.md
- docs/runbooks/admin-dashboard-user-guide-nontechnical.md
- docs/runbooks/admin-dashboard-guide-branch-staff.md
- docs/runbooks/admin-dashboard-guide-super-admin.md
- docs/runbooks/admin-dashboard-guide-bilingual-en-am.md
- docs/runbooks/training/admin-dashboard-trainer-pack-en-am.md
- docs/runbooks/training/admin-dashboard-quick-reference-en-am.md
- docs/runbooks/training/admin-dashboard-training-attendance-checklist.md

---
ይህ ሰነድ ለመደበኛ የደንበኛ ማስረከቢያ ዝግጁ ነው። ከመፈረም በፊት ባዶ ቦታዎችን ይሙሉ።
