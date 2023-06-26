import path from "path";
import fs from "fs";
import * as types from "./index.d";

const getRequestedFiles = (outputs: types.Inputs, files: types.Files) => {
  return {
    output_1: {
      branchCommits: path.resolve(`${outputs.output_1}/${files.branchCommits}`),
      rawDataCommits: path.resolve(
        `${outputs.output_1}/${files.rawDataCommits}`
      ),
    },
    output_2: {
      branchCommits: path.resolve(`${outputs.output_2}/${files.branchCommits}`),
      rawDataCommits: path.resolve(
        `${outputs.output_2}/${files.rawDataCommits}`
      ),
    },
  };
};

const getRawDataCommits = (
  requestedFiles: ReturnType<typeof getRequestedFiles>
) => {
  return {
    rawDataCommits_1: JSON.parse(
      fs.readFileSync(requestedFiles.output_1.rawDataCommits, "utf8")
    ) as types.RawDataCommits,
    rawDataCommits_2: JSON.parse(
      fs.readFileSync(requestedFiles.output_2.rawDataCommits, "utf8")
    ) as types.RawDataCommits,
  };
};

const getBranchCommits = (
  requestedFiles: ReturnType<typeof getRequestedFiles>
) => {
  return {
    branchCommits_1: JSON.parse(
      fs.readFileSync(requestedFiles.output_1.branchCommits, "utf8")
    ) as types.BranchCommits,
    branchCommits_2: JSON.parse(
      fs.readFileSync(requestedFiles.output_2.branchCommits, "utf8")
    ) as types.BranchCommits,
  };
};

const compareBranchCommits = (
  branchCommits: ReturnType<typeof getBranchCommits>
) => {
  return {
    branchCommits_1_not_in_branchCommits_2:
      branchCommits.branchCommits_1.filter(
        (branchCommit_1) =>
          !branchCommits.branchCommits_2.some(
            (branchCommit_2) =>
              branchCommit_1.branchName === branchCommit_2.branchName
          )
      ),
    branchCommits_2_not_in_branchCommits_1:
      branchCommits.branchCommits_2.filter(
        (branchCommit_2) =>
          !branchCommits.branchCommits_1.some(
            (branchCommit_1) =>
              branchCommit_2.branchName === branchCommit_1.branchName
          )
      ),
  };
};

const hydrateBranchCommits = (
  rawDataCommits: ReturnType<typeof getRawDataCommits>,
  branchCommitsDelta: ReturnType<typeof compareBranchCommits>
) => {
  return {
    hydratedBranchCommits_1_not_in_branchCommits_2:
      branchCommitsDelta.branchCommits_1_not_in_branchCommits_2.map(
        (branchCommit_1_not_in_branchCommits_2) => {
          return {
            branchName: branchCommit_1_not_in_branchCommits_2.branchName,
            commitHashes:
              branchCommit_1_not_in_branchCommits_2.commitHashes.map(
                (commitHash) => {
                  return {
                    ...rawDataCommits.rawDataCommits_1[commitHash],
                    commitHash,
                  };
                }
              ),
          };
        }
      ),
    hydratedBranchCommits_2_not_in_branchCommits_1:
      branchCommitsDelta.branchCommits_2_not_in_branchCommits_1.map(
        (branchCommit_2_not_in_branchCommits_1) => {
          return {
            branchName: branchCommit_2_not_in_branchCommits_1.branchName,
            commitHashes:
              branchCommit_2_not_in_branchCommits_1.commitHashes.map(
                (commitHash) => {
                  return {
                    ...rawDataCommits.rawDataCommits_2[commitHash],
                    commitHash,
                  };
                }
              ),
          };
        }
      ),
  };
};

const getFilesAffected = (
  hydratedBranchCommitsDelta: ReturnType<typeof hydrateBranchCommits>
) => {
  const filesAffected_all = {
    filesAffected_1: {} as types.FilesAffected,
    filesAffected_2: {} as types.FilesAffected,
  };

  const uniqueFileList: string[] = [];

  filesAffected_all.filesAffected_1 =
    hydratedBranchCommitsDelta.hydratedBranchCommits_1_not_in_branchCommits_2.reduce(
      (acc, branchCommit) => {
        branchCommit.commitHashes.forEach((commit) => {
          commit.files.forEach((file) => {
            if (!uniqueFileList.includes(file)) {
              uniqueFileList.push(file);
              acc[file] = [commit.commitHash];
            } else {
              if (acc.hasOwnProperty(file)) {
                acc[file].push(commit.commitHash);
              } else {
                acc[file] = [commit.commitHash];
              }
            }
          });
        });
        return acc;
      },
      {} as types.FilesAffected
    );

  filesAffected_all.filesAffected_2 =
    hydratedBranchCommitsDelta.hydratedBranchCommits_2_not_in_branchCommits_1.reduce(
      (acc, branchCommit) => {
        branchCommit.commitHashes.forEach((commit) => {
          commit.files.forEach((file) => {
            if (!uniqueFileList.includes(file)) {
              uniqueFileList.push(file);
              acc[file] = [commit.commitHash];
            } else {
              if (acc.hasOwnProperty(file)) {
                acc[file].push(commit.commitHash);
              } else {
                acc[file] = [commit.commitHash];
              }
            }
          });
        });
        return acc;
      },
      {} as types.FilesAffected
    );

  return {
    filesAffected_all,
    uniqueFileList,
  };
};

const saveToJson = (
  outputs: types.Outputs,
  affectedResults: ReturnType<typeof getFilesAffected>
) => {
  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }
  fs.writeFileSync(
    outputs.filesAffected_all,
    JSON.stringify(affectedResults.filesAffected_all, null, 2)
  );
  fs.writeFileSync(
    outputs.uniqueFileList,
    JSON.stringify(affectedResults.uniqueFileList, null, 2)
  );
};

const main = (
  outputs: types.Outputs,
  inputs: types.Inputs,
  files: types.Files
) => {
  const requestedFiles = getRequestedFiles(inputs, files);

  const rawDataCommits = getRawDataCommits(requestedFiles);

  const branchCommits = getBranchCommits(requestedFiles);

  const branchCommitsDelta = compareBranchCommits(branchCommits);

  const hydratedBranchCommitsDelta = hydrateBranchCommits(
    rawDataCommits,
    branchCommitsDelta
  );

  const affectedResults = getFilesAffected(hydratedBranchCommitsDelta);

  saveToJson(outputs, affectedResults);
};

const outputs: types.Outputs = {
  filesAffected_all: "output/filesAffected_all.json",
  uniqueFileList: "output/uniqueFileList.json",
};

const inputs: types.Inputs = {
  output_1: "input/output_1",
  output_2: "input/output_2",
};

const files: types.Files = {
  branchCommits: "formattedBranchCommits.json",
  rawDataCommits: "formattedRawDataCommit.json",
};
main(outputs, inputs, files);
