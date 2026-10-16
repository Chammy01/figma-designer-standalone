; Preserve NSIS's atomic uninstall/restore logic, including when long paths policy is off.
!macro customUnInit
  Push $R9
  StrCpy $R9 $INSTDIR 4
  ${If} $R9 != "\\?\"
    StrCpy $INSTDIR "\\?\$INSTDIR"
  ${EndIf}
  Pop $R9
!macroend

