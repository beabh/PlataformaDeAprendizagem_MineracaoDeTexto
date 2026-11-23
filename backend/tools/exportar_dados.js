// Exporta catálogo, exercícios e provas do protótipo (js/) para JSON, usado pelo back-end.
// Uso: node tools/exportar_dados.js   (a partir da pasta backend/)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', '..', 'frontend', 'prototipo', 'js');
const janela = {};
const contexto = vm.createContext({ window: janela, localStorage: {}, Date, JSON, Math, Object, Array, String, Number });
for (const arquivo of ['progresso.js', 'exercicios-banco.js', 'provas.js']) {
  vm.runInContext(fs.readFileSync(path.join(JS, arquivo), 'utf8'), contexto, { filename: arquivo });
}

const DEST = path.join(__dirname, '..', 'dados');
fs.mkdirSync(DEST, { recursive: true });
const escrever = (nome, dados) => fs.writeFileSync(path.join(DEST, nome), JSON.stringify(dados, null, 2) + '\n', 'utf8');

escrever('catalogo.json', janela.PLN.CATALOGO);
escrever('exercicios.json', janela.EXERCICIOS);
escrever('provas.json', janela.PROVAS);
console.log('dados exportados para', DEST);
