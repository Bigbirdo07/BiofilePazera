# Homepage EGFR Demo Cache

The homepage expects the unmodified official AlphaFold DB coordinate file at:

`public/demo-structures/P00533_EGFR_AlphaFold.pdb`

Source: AlphaFold DB, UniProt `P00533` (EGFR, Homo sapiens), canonical reference model. The homepage loads this file locally and makes no scientific database request.

When network access is available, populate the cache with:

```sh
curl -fsSL -o public/demo-structures/P00533_EGFR_AlphaFold.pdb \
  https://alphafold.ebi.ac.uk/files/AF-P00533-F1-model_v4.pdb
```

The current Protein Studio retrieval path first queries `https://alphafold.ebi.ac.uk/api/prediction/P00533` and uses the official coordinate URL returned by that metadata. If the metadata reports a different current version or format, use that returned URL and update the homepage filename/path accordingly.
