const PizZip = require('pizzip');
const fs = require('fs');

const ANCHOR_NAMES = [
  'assinatura_paciente', 'assinatura_dr', 'assinatura_responsavel',
  'rubrica_paciente', 'rubrica_dr', 'rubrica_responsavel'
];

function processAnchorsInXml(xml, isDeduplicate) {
  const seenAnchors = new Set();
  
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, function(paragraph) {
    const plainText = paragraph.replace(/<[^>]+>/g, '');
    
    var foundAnchor = null;
    for (var i = 0; i < ANCHOR_NAMES.length; i++) {
      var anchor = ANCHOR_NAMES[i];
      var anchorPattern = new RegExp('\\{\\{\\{\\s*' + anchor + '\\s*\\}\\s*\\}\\s*\\}');
      if (anchorPattern.test(plainText)) {
        foundAnchor = anchor;
        break;
      }
    }
    
    if (!foundAnchor) return paragraph;
    
    var fullAnchor = '{{{' + foundAnchor + '}}}';
    
    if (isDeduplicate && seenAnchors.has(foundAnchor)) {
      var anchorRegex2 = new RegExp('\\{\\{\\{\\s*' + foundAnchor + '\\s*\\}\\s*\\}\\s*\\}');
      var remaining = plainText.replace(anchorRegex2, '').trim();
      if (remaining === '') {
        console.log('  🗑️  Removeu parágrafo duplicado de:', fullAnchor);
        return '';
      }
      return paragraph;
    }
    
    seenAnchors.add(foundAnchor);

    var pPrMatch = paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    var pPr = pPrMatch ? pPrMatch[0] : '';
    var pAttrsMatch = paragraph.match(/^<w:p\b([^>]*)>/);
    var pAttrs = pAttrsMatch ? pAttrsMatch[1] : '';

    var anchorRegex = new RegExp('\\{\\{\\{\\s*' + foundAnchor + '\\s*\\}\\s*\\}\\s*\\}');
    var textBefore = plainText.split(anchorRegex)[0] || '';
    var textAfter = plainText.split(anchorRegex)[1] || '';
    
    var hiddenRPr = '<w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>';
    
    var runs = '';
    if (textBefore.trim()) {
      runs += '<w:r><w:t xml:space="preserve">' + textBefore + '</w:t></w:r>';
    }
    runs += '<w:r>' + hiddenRPr + '<w:t>' + fullAnchor + '</w:t></w:r>';
    if (textAfter.trim()) {
      runs += '<w:r><w:t xml:space="preserve">' + textAfter + '</w:t></w:r>';
    }
    
    console.log('  ✅ Processou:', fullAnchor, 
      textBefore.trim() ? '(com texto antes: "' + textBefore.trim() + '")' : '',
      textAfter.trim() ? '(com texto depois: "' + textAfter.trim() + '")' : ''
    );
    
    return '<w:p' + pAttrs + '>' + pPr + runs + '</w:p>';
  });
}

// === TEST ===

const templateFile = 'templates/1776044708460-contrato_rinoplastia_adulto_v5.docx';
const content = fs.readFileSync(templateFile, 'binary');
const zip = new PizZip(content);

// Process document.xml
console.log('\n=== PROCESSANDO document.xml (com deduplicação) ===\n');
var docXml = zip.file('word/document.xml').asText();

// Count anchors before
var beforeText = docXml.replace(/<[^>]+>/g, '');
ANCHOR_NAMES.forEach(function(a) {
  var pattern = new RegExp('\\{\\{\\{\\s*' + a + '\\s*\\}\\s*\\}\\s*\\}', 'g');
  var matches = beforeText.match(pattern);
  if (matches) console.log('  ANTES:', a, '→', matches.length, 'ocorrência(s)');
});

docXml = processAnchorsInXml(docXml, true);

// Count anchors after
console.log('\n  RESULTADO:');
var afterText = docXml.replace(/<[^>]+>/g, '');
ANCHOR_NAMES.forEach(function(a) {
  var pattern = new RegExp('\\{\\{\\{' + a + '\\}\\}\\}', 'g');
  var matches = afterText.match(pattern);
  if (matches) console.log('    ', a, '→', matches.length, 'ocorrência(s)');
});

// Check invisibility
var whiteCount = (docXml.match(/w:val="FFFFFF"/g) || []).length;
console.log('    Propriedades de invisibilidade (FFFFFF):', whiteCount);
var redCount = (docXml.match(/C00000/g) || []).length;
console.log('    Cores vermelhas restantes (C00000):', redCount, '(deve ser 0 nas âncoras)');

// Process footer
console.log('\n=== PROCESSANDO footer1.xml (sem deduplicação) ===\n');
var footerXml = zip.file('word/footer1.xml').asText();

var footerTextBefore = footerXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log('  ANTES (texto):', footerTextBefore);

footerXml = processAnchorsInXml(footerXml, false);

console.log('\n  RESULTADO:');
var footerAfterText = footerXml.replace(/<[^>]+>/g, '');
ANCHOR_NAMES.forEach(function(a) {
  var pattern = new RegExp('\\{\\{\\{' + a + '\\}\\}\\}', 'g');
  var matches = footerAfterText.match(pattern);
  if (matches) console.log('    ', a, '→', matches.length, 'ocorrência(s)');
});
var footerWhite = (footerXml.match(/w:val="FFFFFF"/g) || []).length;
console.log('    Propriedades de invisibilidade (FFFFFF):', footerWhite);

console.log('\n=== TESTE CONCLUÍDO ===');
