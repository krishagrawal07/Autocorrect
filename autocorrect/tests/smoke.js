const fs = require("fs");
const vm = require("vm");

const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
const element = () => ({
  addEventListener() {},
  classList,
  disabled: false,
  value: "",
  textContent: "",
  innerHTML: ""
});

global.document = {
  getElementById: element,
  body: { classList },
  createElement: element
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.window = { scrollTo() {} };
global.crypto = require("crypto").webcrypto;

const source = fs.readFileSync("app.js", "utf8");
const assertion = `
  const smoke = correctText("i definately beleive teh tool woudl work.  yes", "balanced");
  if (smoke.output !== "I definitely believe the tool would work. Yes") {
    throw new Error("Unexpected correction output: " + smoke.output);
  }
  if (smoke.changes.length !== 7) {
    throw new Error("Unexpected correction count: " + smoke.changes.length);
  }
  console.log(smoke.output);
  console.log("changes=" + smoke.changes.length);
`;

vm.runInThisContext(source + assertion);
