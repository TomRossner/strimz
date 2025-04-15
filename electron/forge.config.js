module.exports = {
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
              repository: {
                owner: 'TomRossner',
                name: 'Strimz'
              },
              prerelease: true
            }
        },
    ],
    packagerConfig: {},
    makers: [
      {
        name: '@electron-forge/maker-zip'
      }
    ]
}