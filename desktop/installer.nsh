; Preserve NSIS's atomic uninstall/restore logic, including when long paths policy is off.
!macro customUnInit
  Push $R9
  StrCpy $R9 $INSTDIR 4
  ${If} $R9 != "\\?\"
    StrCpy $INSTDIR "\\?\$INSTDIR"
  ${EndIf}
  Pop $R9
!macroend

; Unpublished early candidates lacked the extended-path uninstaller initialization.
!macro customUnInstallCheck
  ${If} $R0 != 0
    Push $R8
    Push $R9
    ReadRegStr $R8 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $R8 == ""
      SetErrorLevel 2
      Quit
    ${EndIf}
    StrCpy $R9 $R8 4
    ${If} $R9 != "\\?\"
      StrCpy $R8 "\\?\$R8"
    ${EndIf}
    ClearErrors
    ExecWait '"$PLUGINSDIR\old-uninstaller.exe" /S /KEEP_APP_DATA $0 _?=$R8' $R0
    Pop $R9
    Pop $R8
    ${If} ${Errors}
      SetErrorLevel 2
      Quit
    ${EndIf}
    ${If} $R0 != 0
      MessageBox MB_OK|MB_ICONEXCLAMATION "The previous application could not be uninstalled. Close it and try again. Error: $R0"
      SetErrorLevel 2
      Quit
    ${EndIf}
  ${EndIf}
!macroend
