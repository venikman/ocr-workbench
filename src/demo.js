import { foodInspectionDomain } from "./domains.js";
// Real, unchanged local OCR output. Provenance and SHA-256 hashes: SAMPLE-SOURCES.md.
export const demoBundle = {
  schemaVersion: 2,
  domains: [foodInspectionDomain],
  cases: [
    {
      id: "alameda-inspection-page-1",
      domainId: "food-inspection",
      title: "Alameda County · Food inspection form",
      source: {
        image: "/assets/alameda-inspection-page-1.png",
        url: "https://deh.acgov.org/operations-assets/docs/foodsafety/OFFICIAL%20INSPECTION%20REPORT%20FORM.pdf",
        page: 1,
        width: 1530,
        height: 1980,
      },
      runs: [
        {
          id: "tesseract-psm3",
          model: "Tesseract 5.5.2 · PSM 3",
          raw: "County of Alameda Date;\nDepartment of Environmental Health OFFICIAL RETAIL FOOD J time in: —\n1131 Harbor Bay Parkway, Suite 200 Time Out: _\nAlameda, CA 94502-6577 INSPECTION REPORT\n510-567-6700 _http://www.acgov.org/aceh Page | of _\nFacility Name: Address: City: cT:\nPermit #: Exp Date: PR: SR: co: Inspection Type\n\nR FU cio\nPmt Holder: Food Safety Cert Name: Exp Date: FBInv Const Consult\n\nMajor violations pose threats to public health and must be corrected immediately. Non-compliance may warrant closure of the facility.\n\nCDC RISK FACTORS OUT | PTS | -PTS APPROVED RETAIL PRACTICES OUT | PTS | -PTS\nDemonstration of Knowledge Supervision\n1. Demonstration of food safety knowledge 2 24. Person in Charge present & performs duties 1\nEmployee Health & Hygienic Practices Personal Cleanline\n2. Compliance w/ Communicable disease procedures 4 25. Personal cleanliness & hair restraints 1\n3. No discharge from eyes, nose & mouth 2 General Food Safety Requirements\n4, Proper eating, tasting, drinking or tobacco use 2 26. Approved thawing methods used, frozen food 1\n5. Hands clean and properly washed; gloves used 4 27. Food separated and protected 1\nproperly; RTE food handling\n6. Adequate handwashing facilities supplied & 2 28. Washing fruits and vegetables 1\naccessible\nTime & Temperature Relationships 29. Toxic substances properly identified, stored, 1\nused\n7. Proper hot and cold holding temperatures 4/2 Food Storage/Display/Ser vice\n8. Time as a public health control; procedures/ records 4/2 30. Food storage; food storage containers labeled 1\n9. Proper cooling methods 31. Consumer self-service 1\n10. Proper cooking time & temperatures 32. Food properly labeled & honestly presented 1\n11. Proper reheating procedures for hot holding Equipment/Uten:\n33. Nonfood conta 1\nProtection from Contamination 34. Warewashing facilities: installed, maintained, 1\nused; testing dev\n12. Returned and reservice of food 2 35. Equipment/Utensils ANSI approved 1\n13. Food in good condition, safe and unadulterated 4/2 36, Equipment, utensils and linens: storage & use 1\n14. Food contact surfaces: clean and sanitized 4/2 37. Vending machines maintained 1\nFood from Approved Sources 38. Approved & adequate ventilation and lighting 1\n15. Food obtained from approved source 39. Food thermometers provided and accurate 1\n16. Compliance with shell stock tags, condition, 40. Wiping cloths: properly used and stored 1\ndisplay\n17. Compliance with Gulf Oyster Regulations 2 Physical Facilities\nConformance with Approved Procedures 41. Plumbing: proper backflow devices 1\n18. Compliance with variance, specialized process & 2 42. Garbage and refuse properly disposed; facilities 1\nHACCP Plan maintained\nConsumer Advisory 43. Toilet facilities cleaned, supplied, maintained 1\n19. Consumer advisory for raw undercooked foods and 44. Premises; personal/cleaning items; vermin- 1\nfoods with 4 of 1% alcohol 2 proofing\nHighly Susceptible Populations Permanent Food Facilities\n20. Licensed health care facilities/ public & private 4 45. Floor, walls and ceilings are maintained and 1\nschools; prohibited foods not offered clean\nWater/ Hot Water . . a 7 1\n21. Hot and cold water available Temp 4 46. No living or sleeping quarters inside facility\nLiquid Waste Disposal\niquig raste isposa Signs/ Requirements 1\n22. Sewage and wastewater properly disposed 4/2 47. Signs and permits posted; last inspection 1\nreports and food safety certificates available\nVermin Compliance & Enforcement\n48. Compliance with plan review requirements 1\n23. No rodents, insects, birds, or animals 4/2 49. Facility operating with valid permit 1\n\nReceived by:\n\nEHS:\n\n",
          origin:
            "Local OCR · English LSTM · --oem 1 --psm 3 · 180 dpi · 2026-10-06",
        },
        {
          id: "tesseract-psm6",
          model: "Tesseract 5.5.2 · PSM 6",
          raw: "County of Alameda Date: a\nDepartment of Environmental Health OFFICIAL RETAIL FOOD J time in: —\n1131 Harbor Bay Parkway, Suite 200 Time Out: _\nAlameda, CA 94502-6577 INSPECTION REPORT\n510-567-6700 _http://www.acgov.org/aceh Page lof _ _\nFacility Name: Address: City: cT:\nPermit #: Exp Date: PR: SR: co: Inspection Type\nR FU (ele)\nPmt Holder: Food Safety Cert Name: Exp Date: FBInv Const Consult\nMajor violations pose threats to public health and must be corrected immediately. Non-compliance may warrant closure of the facility.\nCDC RISK FACTORS APPROVED RETAIL PRACTICES\nDemonstration of Knowledge Supervision\n1. Demonstration of food safety knowledge 2 24. Person in Charge present & performs duties\nEmployee Health & Hygienic Practices Personal Cleanliness\n2. Compliance w/ Communicable disease procedures 4 25. Personal cleanliness & hair restraints\n3. No discharge from eyes, nose & mouth Fi? | General Food Safety Requirements Ff ft\n4. Proper eating, tasting, drinking or tobacco use Fi? | 26. Approved thawing methods used, frozen food Fo! ft\n5. Hands clean and properly washed; gloves used 4 27. Food separated and protected\nproperly; RTE food handling\n6. Adequate handwashing facilities supplied & 2 28. Washing fruits and vegetables\naccessible\nTime & Temperature Relationships | | fs 29. Toxic substances properly identified, stored, | oft\nused\n7. Proper hot and cold holding temperatures ee Food Storage/Display/Ser vice ff ft\n8. Time as a public health control; procedures/ records [ee 30. Food storage; food storage containers labeled Fo! ft\n9. Proper cooling methods F of4 ft 31. Consumer self-service Fo! ft\n10. Proper cooking time & temperatures (4 | 32. Food properly labeled & honestly presented fof! ft\n11. Proper reheating procedures for hot holding 4 Equipment/Utensils/Linens\n33. Nonfood contact surfaces clean\nProtection from Contamination 34. Warewashing facilities: installed, maintained,\nused; testing devices\n12. Returned and reservice of food f f2 | 35. Equipment/Utensils ANSI approved ee\n13. Food in good condition, safe and unadulterated a 36. Equipment, utensils and linens: storage & use a\n14. Food contact surfaces: clean and sanitized ee 37. Vending machines maintained ee\nFood from Approved Sources Ff ft 38. Approved & adequate ventilation and lighting Fo! ft\n16. Compliance with shell stock tags, condition, 2 40. Wiping cloths: properly used and stored\ndisplay\n17. Compliance with Gulf Oyster Regulations [ [2 | [P Pysicat Facitities Ff ft\nConformance with Approved Procedures a 41. Plumbing: proper backflow devices ee\n18. Compliance with variance, specialized process & 2 42. Garbage and refuse properly disposed; facilities\nHACCP Plan maintained\n‘Consumer Advisory cr | ft] 43. Toilet facilities cleaned, supplied, maintained ee\n19. Consumer advisory for raw undercooked foods and 44. Premises; personal/cleaning items; vermin-\nfoods with 4 of 1% alcohol 2 proofing\n20. Licensed health care facilities/ public & private 4 45. Floor, walls and ceilings are maintained and\nschools; prohibited foods not offered clean\nWater/ Hot Water we . ae ae\n21. Hot and cold water available Temp 4 46. No living or sleeping quarters inside facility\nLiquid Waste Disposal\n[mewasersmost | Tf Signs! Requirements | fp |_|\n22. Sewage and wastewater properly disposed 4/2 47. Signs and permits posted; last inspection\nreports and food safety certificates available\nVermin Compliance & Enforcement\n48. Compliance with plan review requirements\n23. No rodents, insects, birds, or animals | [eet 49. Facility operating with valid permit Foot ft\nReceived by: EHS:\n",
          origin:
            "Local OCR · English LSTM · --oem 1 --psm 6 · 180 dpi · 2026-10-06",
        },
      ],
      reviews: {
        "tesseract-psm3": {
          annotations: [
            {
              id: "seed-column-structure",
              conceptIds: ["checklist-item", "table-cell"],
              ruleIds: ["row-association"],
              box: {
                x: 0.043,
                y: 0.24,
                w: 0.913,
                h: 0.029,
              },
              lines: {
                start: 15,
                end: 16,
              },
              category: "structure",
              note: "The two table halves are merged into single OCR lines.",
              correction: "",
              status: "open",
            },
            {
              id: "seed-truncated-equipment",
              conceptIds: ["checklist-item", "table-cell"],
              ruleIds: ["source-completeness"],
              box: {
                x: 0.518,
                y: 0.475,
                w: 0.28,
                h: 0.024,
              },
              lines: {
                start: 31,
                end: 32,
              },
              category: "omission",
              note: "Equipment heading and nonfood-contact cell are truncated.",
              correction: "",
              status: "open",
            },
            {
              id: "seed-alcohol-fraction",
              conceptIds: ["checklist-item", "table-cell"],
              ruleIds: ["symbol-fidelity"],
              box: {
                x: 0.049,
                y: 0.714,
                w: 0.305,
                h: 0.027,
              },
              lines: {
                start: 47,
                end: 48,
              },
              category: "text",
              note: "½ is read as 4 in the alcohol-content row.",
              correction: "",
              status: "open",
            },
          ],
          done: false,
          reviewedAt: null,
        },
        "tesseract-psm6": {
          annotations: [
            {
              id: "seed-missing-row",
              conceptIds: ["checklist-item", "table-cell"],
              ruleIds: ["source-completeness", "row-association"],
              box: {
                x: 0.044,
                y: 0.594,
                w: 0.912,
                h: 0.02,
              },
              lines: {
                start: 35,
                end: 36,
              },
              category: "omission",
              note: "The row containing items 15 and 39 is missing.",
              correction: "",
              status: "open",
            },
          ],
          done: false,
          reviewedAt: null,
        },
      },
    },
    {
      id: "alameda-inspection-page-3",
      domainId: "food-inspection",
      title: "Alameda County · Corrective actions",
      source: {
        image: "/assets/alameda-inspection-page-3.png",
        url: "https://deh.acgov.org/operations-assets/docs/foodsafety/OFFICIAL%20INSPECTION%20REPORT%20FORM.pdf",
        page: 3,
        width: 1530,
        height: 1980,
      },
      runs: [
        {
          id: "tesseract-psm3",
          model: "Tesseract 5.5.2 · PSM 3",
          raw: "County of Alameda Date:\n\nDepartment of Environmental Heath ~— | OFFICIAL RETAIL FOOD | tine in:\n1131Harbor Bay Parkway, Suite 200 i :\nAlameda, Ca 94502-6577 INSPECTION REPORT Time Out:\n510-567-6700\n\nhttp://www.acgov.org/aceh Page of\n\nFacility Name: Address: City: cT:\n\nAll violations of the California Health & Safety Code as listed on this report must be corrected. Major violations must be corrected\nimmediately. Non-compliance may warrant immediate closure of the food facility. See reverse sides of this inspection report form for code\nsections that correspond to each violation.\n\nTEMPERATURE CONTROL-Documentation is required for all food facilities with PHF (Potentially Hazardous Foods) CO No PHF\nFood Item Temp | Temp Process/ Food Food Item Temp | Temp Process/ Food\n(CF) | Violation Holding | Discarded (CF) | Violation] Holding Discarded\n\\v) Location | (Amount) v) Location (Amount)\n\nOBSERVATIONS AND CORRECTIVE ACTIONS\n\nACTIONS/STATUS\n\nThe Person-In-Charge (PIC) is responsible for maintaining this food facility in\ncompliance with all applicable sections of the California Health & Safety Code.\n\n50. Food/Equipment Impounded or VCD (1) so\n\n51. Permit Suspension / Require Closure(1) Oo Received by (Sign):\nName & Title (Print):\nInspection Report Total Score. EHS:\n\nPhone: (510)\n\nFollow-Up Inspection Date\n\n",
          origin:
            "Local OCR · English LSTM · --oem 1 --psm 3 · 180 dpi · 2026-10-06",
        },
        {
          id: "tesseract-psm6",
          model: "Tesseract 5.5.2 · PSM 6",
          raw: "County of Alameda Date:\nCounty of Act mentatears | OFFICIAL RETAIL FOOD | 2. —————\n1131Harbor Bay Parkway, Suite 200 Time Out:\nAlameda, Ca 94502-6577 INSPECTION REPORT me\n510-567-6700 Pz f\nhttp://www.acgov.org/aceh age _______ ol ____________\nFacility Name: Address: City: CT:\nAll violations of the California Health & Safety Code as listed on this report must be corrected. Major violations must be corrected\nimmediately. Non-compliance may warrant immediate closure of the food facility. See reverse sides of this inspection report form for code\nsections that correspond to each violation.\nTEMPERATURE CONTROL-Documentation is required for all food facilities with PHF (Potentially Hazardous Foods) CO No PHF\nFood Item Temp | Temp Process/ Food Food Item Temp | Temp Process/ Food\n(CF) | Violation Holding | Discarded (CF) | Violation] Holding Discarded\n\\v) Location | (Amount) v) Location (Amount)\nOBSERVATIONS AND CORRECTIVE ACTIONS\nACTIONS/STATUS yG . an . a\nThe Person-In-Charge (PIC) is responsible for maintaining this food facility in\ncompliance with all applicable sections of the California Health & Safety Code.\n50. Food/Equipment Impounded or VCD (1) so\n51. Permit Suspension / Require Closure(1) Oo Received by (Sign):\nName & Title (Print): i\nInspection Report Total Score. EHS\nPhone: (510)\nFollow-Up Inspection Date\n",
          origin:
            "Local OCR · English LSTM · --oem 1 --psm 6 · 180 dpi · 2026-10-06",
        },
      ],
      reviews: {
        "tesseract-psm3": {
          annotations: [],
          done: false,
          reviewedAt: null,
        },
        "tesseract-psm6": {
          annotations: [],
          done: false,
          reviewedAt: null,
        },
      },
    },
  ],
};
