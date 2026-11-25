const mailJobs = require('./mailJobs');
const emailTemplates = require('./emailTemplates');


module.exports = {
    ...mailJobs,
    ...emailTemplates
};
