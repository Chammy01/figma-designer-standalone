!include "LogicLib.nsh"
; Preserve NSIS's atomic uninstall/restore logic, including when long paths policy is off.
!macro customUnInit
  Push $R9
  StrCpy $R9 $INSTDIR 4
  ${If} $R9 != "\\?\"
    StrCpy $INSTDIR "\\?\$INSTDIR"
  ${EndIf}
  Pop $R9
!macroend

; The legacy Windows CopyFiles operation silently omits files past MAX_PATH.
; Payload paths are at most 149 characters; leave room for separators and terminator.
!ifndef BUILD_UNINSTALLER
Function desktopCheckInstallPath
  StrLen $R9 $INSTDIR
  ${If} $R9 > 100
    MessageBox MB_OK|MB_ICONEXCLAMATION "Choose a shorter installation folder (at most 100 characters). No application files have been changed." /SD IDOK
    SetErrorLevel 2
    Quit
  ${EndIf}
FunctionEnd
!endif
!macro customInit
  Call desktopCheckInstallPath
!macroend
!macro customPageAfterChangeDir
Function desktopDirectoryCheck
  ${StrContains} $R8 "${APP_FILENAME}" $INSTDIR
  ${If} $R8 == ""
    StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
  ${EndIf}
  Call desktopCheckInstallPath
  Abort
FunctionEnd
  Page custom desktopDirectoryCheck
!macroend

