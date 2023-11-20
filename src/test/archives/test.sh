#!/bin/bash

echo "start"

# Définir l'URL de base
base_url="http://localhost:3000"


# Vérifier si le numéro de page est passé en argument
if [ $# -lt 1 ]; then
    echo "Usage: $0 <page_number> [process_state_keys]"
    exit 1
fi

# Récupérer le numéro de page à partir des arguments
page_number=$1

# Vérifier si les processStateKeys sont passés en argument
if [ $# -ge 2 ]; then
    process_state_keys=$2
fi

# Envoyer une requête GET à l'API /documents
if [ -n "$process_state_keys" ]; then
    response=$(curl -v -s "$base_url/documents?pageNumber=$page_number&processStateKeys=$process_state_keys")
else
    response=$(curl -v -s "$base_url/documents?pageNumber=$page_number")
fi

# Analyser la réponse JSON et afficher les résultats
echo $response | jq
exit 1
