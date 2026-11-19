const userCacheInstance = require('./userCacheInstance')
const sessionInstance = require('./sessionInstance')


const configureAllInstanceRepositories = ({
    userCacheInstanceClient,
    sessionInstanceClient
}) => {
    userCacheInstance.configureRepositories(userCacheInstanceClient)
    sessionInstance.configureRepositories(sessionInstanceClient)
}


module.exports = {
    configureAllInstanceRepositories,
    userCacheInstance: userCacheInstance,
    sessionInstance: sessionInstance
}