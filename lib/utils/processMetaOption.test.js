const processMetaOption = require('./processMetaOption');

describe('processMetaOption tests', () => {
  it('It parses correctly', () => {
    expect(processMetaOption(['githubActionRequest:true', 'trigger:manual'])).toEqual({
      githubActionRequest: 'true',
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
