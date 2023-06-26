export type Outputs = {
  filesAffected_all: string;
  uniqueFileList: string;
};

export type Inputs = {
  output_1: string;
  output_2: string;
};
export type Files = {
  branchCommits: string;
  rawDataCommits: string;
};

export type RawDataCommits = {
  [key: string]: {
    author: string;
    subject: string;
    date: string;
    branches: string;
    parents: string[];
    files: string[];
  };
};

export type BranchCommits = {
  branchName: string;
  commitHashes: string[];
}[];

export type FilesAffected = {
  [key: string]: string[];
};
