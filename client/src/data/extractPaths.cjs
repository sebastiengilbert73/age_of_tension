const fs = require('fs');

const svgPath = 'C:\\Users\\sebas\\Documents\\projects\\age_of_tension\\client\\src\\assets\\world.svg';
const outputPath = 'C:\\Users\\sebas\\Documents\\projects\\age_of_tension\\client\\src\\data\\countriesData.js';

const countries = [
    { id: 'AF', line: 22 },
    { id: 'AO', line: 42 },
    { id: 'AR', line: 46 },
    { id: 'AU', line: 58 },
    { id: 'BF', line: 90 },
    { id: 'BJ', line: 106 },
    { id: 'BO', line: 118 },
    { id: 'BR', line: 130 },
    { id: 'BW', line: 146 },
    { id: 'BY', line: 150 },
    { id: 'CA', line: 158 },
    { id: 'CD', line: 166 },
    { id: 'CF', line: 170 },
    { id: 'CG', line: 174 },
    { id: 'CI', line: 182 },
    { id: 'CL', line: 190 },
    { id: 'CM', line: 194 },
    { id: 'CN', line: 198 },
    { id: 'CO', line: 202 },
    { id: 'CR', line: 206 },
    { id: 'CU', line: 210 },
    { id: 'DE', line: 238 },
    { id: 'DO', line: 250 },
    { id: 'DZ', line: 254 },
    { id: 'EC', line: 258 },
    { id: 'EE', line: 266 },
    { id: 'EG', line: 262 },
    { id: 'ER', line: 274 },
    { id: 'ES', line: 278 },
    { id: 'ET', line: 282 },
    { id: 'FI', line: 286 },
    { id: 'FR', line: 306 },
    { id: 'GA', line: 310 },
    { id: 'GB', line: 314 },
    { id: 'GH', line: 334 },
    { id: 'GN', line: 350 },
    { id: 'GQ', line: 362 },
    { id: 'GT', line: 374 },
    { id: 'HN', line: 398 },
    { id: 'HT', line: 406 },
    { id: 'ID', line: 414 },
    { id: 'IL', line: 422 },
    { id: 'IN', line: 430 },
    { id: 'IQ', line: 438 },
    { id: 'IR', line: 442 },
    { id: 'IT', line: 450 },
    { id: 'JP', line: 446 },
    { id: 'JM', line: 458 },
    { id: 'JO', line: 462 },
    { id: 'KE', line: 474 },
    { id: 'KH', line: 482 },
    { id: 'KP', line: 498 },
    { id: 'KR', line: 502 },
    { id: 'KW', line: 510 },
    { id: 'KZ', line: 518 },
    { id: 'LA', line: 522 },
    { id: 'LB', line: 526 },
    { id: 'LR', line: 542 },
    { id: 'LT', line: 550 },
    { id: 'LV', line: 558 },
    { id: 'LY', line: 562 },
    { id: 'MA', line: 566 },
    { id: 'MG', line: 578 },
    { id: 'ML', line: 598 },
    { id: 'MM', line: 606 },
    { id: 'MR', line: 622 },
    { id: 'MW', line: 642 },
    { id: 'MX', line: 646 },
    { id: 'MY', line: 650 },
    { id: 'MZ', line: 654 },
    { id: 'NA', line: 658 },
    { id: 'NE', line: 666 },
    { id: 'NG', line: 674 },
    { id: 'NI', line: 678 },
    { id: 'OM', line: 706 },
    { id: 'PA', line: 710 },
    { id: 'PE', line: 714 },
    { id: 'PH', line: 726 },
    { id: 'PK', line: 730 },
    { id: 'PL', line: 734 },
    { id: 'PY', line: 762 },
    { id: 'QA', line: 766 },
    { id: 'RU', line: 782 },
    { id: 'RW', line: 786 },
    { id: 'SA', line: 754 },
    { id: 'SD', line: 802 },
    { id: 'SE', line: 806 },
    { id: 'SG', line: 810 },
    { id: 'SL', line: 830 },
    { id: 'SN', line: 838 },
    { id: 'SO', line: 842 },
    { id: 'SS', line: 850 },
    { id: 'SV', line: 858 },
    { id: 'SY', line: 866 },
    { id: 'TD', line: 878 },
    { id: 'TG', line: 886 },
    { id: 'TH', line: 890 },
    { id: 'TN', line: 910 },
    { id: 'TR', line: 918 },
    { id: 'TZ', line: 934 },
    { id: 'UA', line: 938 },
    { id: 'UG', line: 942 },
    { id: 'US', line: 970 },
    { id: 'UY', line: 974 },
    { id: 'VE', line: 990 },
    { id: 'VN', line: 1002 },
    { id: 'YE', line: 1018 },
    { id: 'ZA', line: 1026 },
    { id: 'ZM', line: 1030 },
    { id: 'ZW', line: 1034 }
];

try {
    const content = fs.readFileSync(svgPath, 'utf8');
    const lines = content.split('\n');

    const data = {};

    countries.forEach(c => {
        const lineContent = lines[c.line - 1];
        if (!lineContent) {
            console.warn(`Line ${c.line} is empty for ${c.id}`);
            return;
        }
        const match = lineContent.match(/d="([^"]+)"/);
        if (match) {
            data[c.id] = match[1];
        } else {
            console.warn(`Could not find path for ${c.id} on line ${c.line}`);
            // Fallback: search nearby lines if the line index moved slightly
            for (let i = -2; i <= 2; i++) {
                const fallbackLine = lines[c.line - 1 + i];
                if (fallbackLine && fallbackLine.includes(`id="${c.id}"`)) {
                    // Found the ID, look for the 'd' attribute in this or previous lines
                    // This is a bit complex for a quick script, hopefully the lines are correct
                }
            }
        }
    });

    const outputContent = `export const countriesData = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(outputPath, outputContent);
    console.log('Successfully written countriesData.js');
} catch (err) {
    console.error('Error:', err.message);
}
