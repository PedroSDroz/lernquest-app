// One wording for answer feedback in every topic (REQ-m3-test-136 to -142, -166 to -168). Pure, no DOM.
// Since FEAT-m3-test-020 the box shows only "Nicht ganz." for a wrong answer that is an item; `wrong` is the sentence kept for screen readers.
// Names are passed in already spelt as in the topic's content list.
const Feedback = {
  // A right answer. Without `typed` (picked or pointed) it is just confirmed; with `typed`, the spelling line
  // is added only when the accepted text differs from the correct name (case, accents, a small typo) (REQ-m3-test-166 to -168).
  right(name, typed) {
    if (typed !== undefined && typed !== null && String(typed).trim() !== name) return 'Richtig! Pass auf die Schreibweise: ' + name + '.';
    return 'Richtig! ' + name + '.';
  },
  // A wrong answer that is an item of the topic. `dotted`: the map shows the child's answer dotted (REQ-137).
  wrong(correctName, answerName, dotted = true) {
    return 'Leider falsch. Richtig: ' + correctName + '. Deine Antwort' + (dotted ? ' (gepunktet)' : '') + ': ' + answerName + '.';
  },
  // A typed answer that matches nothing in the topic; `notOne` is the topic's phrase, e.g. "keiner der 14 Flüsse" (REQ-139).
  wrongNoMatch(correctName, typed, notOne) {
    return 'Leider falsch. Richtig: ' + correctName + '. Deine Antwort: „' + String(typed).trim() + '“ ist ' + notOne + '.';
  },
};
if (typeof module !== 'undefined') module.exports = { Feedback };
