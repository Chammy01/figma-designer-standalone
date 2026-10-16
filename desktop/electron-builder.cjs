module.exports={
  appId:'com.chammy01.figmadesigner',productName:'Figma Designer',electronVersion:'44.7.2',
  extraMetadata:{main:'desktop/main.mjs',version:'1.4.4',author:{name:'Chammy01'},description:'Editable native Figma design workspace'},
  directories:{output:'release-staging/desktop'},files:['desktop/main.mjs','desktop/service.mjs','desktop/policy.mjs','desktop/preload.cjs','desktop/preview-preload.cjs','package.json'],
  extraResources:[{from:'.figma-designer/desktop/payload',to:'payload'}],
  asar:true,asarUnpack:['desktop/service.mjs'],npmRebuild:false,forceCodeSigning:false,
  win:{target:[{target:'nsis',arch:['x64']},{target:'zip',arch:['x64']}],executableName:'Figma Designer',icon:'.figma-designer/desktop/icons/icon.ico',signAndEditExecutable:true,signExecutable:false},
  nsis:{include:'desktop/installer.nsh',oneClick:false,perMachine:false,allowElevation:false,packElevateHelper:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:false,createStartMenuShortcut:true,shortcutName:'Figma Designer',deleteAppDataOnUninstall:false,artifactName:'Figma-Designer-1.4.4-Windows-Setup.${ext}'},
  artifactName:'Figma-Designer-1.4.4-Windows-Portable.${ext}',publish:null
};
