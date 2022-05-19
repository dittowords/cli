const processMetaOption = require('./processMetaOption');

describe('processMetaOption tests', () => {
  it('It parses correctly', () => {
    expect(processMetaOption(['context:github-action', 'trigger:manual'])).toEqual({
      context: 'github-action',
      trigger: 'manual',
    });
  });
  it('Malformed doesnt crash', () => {
    expect(processMetaOption(['context:github-action', 'trigger'])).toEqual({
      context: 'github-action',
      trigger: undefined,
    });
  });
});
