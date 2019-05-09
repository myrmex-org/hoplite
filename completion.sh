#/usr/bin/env bash
_dothis_completions()
{
  # echo $EOL
  values="$(/Users/alex/workspace/hoplite/dist/test.js completion "${COMP_LINE}" ${COMP_CWORD})"
  # echo ${values}
  COMPREPLY=($(compgen -W "${values}" -- "${COMP_WORDS[COMP_CWORD]}"))
}

complete -F _dothis_completions hoplite