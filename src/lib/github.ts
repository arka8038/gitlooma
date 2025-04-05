import { aiSummarizeCommit } from './gemini';
import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from 'axios';
import { on } from 'events';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
}

export const gitCommitHashes = async (githubUrl: string): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  })

  const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()) as any[]
  
  return sortedCommits.slice(0, 15).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? ""
  }))
}

const fetchProjectGithubUrl = async (projectId: string) => {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });

  if (!project?.githubUrl) {
    throw new Error("GitHub URL not found for the project");
  }

  return {project, githubUrl: project?.githubUrl};
}

const filterUnprocessedCommits = async (projectId: string, commitHashes: Response[]) => {
  const processedCommits = await db.commit.findMany({
    where: {
      projectId
    }
  })

  const unprocessedCommits = commitHashes.filter((commit) => 
    !processedCommits.some((processedCommits) => processedCommits.commitHash === commit.commitHash)
  )

  return unprocessedCommits
}


const summarizeCommits = async (githubUrl: string, commitHash: string) => {
  const {data} = await axios.get(`${githubUrl}/commit/${commitHash}.diff`,
    {
      headers: {
        Accept: 'application/vnd.github.v3.diff'
      }
    }
  )

  const aiSummarizeData = await aiSummarizeCommit(data) || ""
  return aiSummarizeData
}


export const pollCommits = async (projectId: string) => {
  const { githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await gitCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes)
  const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
    return summarizeCommits(githubUrl, commit.commitHash)
  }))

  const summaries = summaryResponses.map((response) => {
    if(response.status === 'fulfilled') {
      return response.value as string
    }
    return ""
  })

  const commits = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      return {
        projectId: projectId,
        commitHash: unprocessedCommits[index]!.commitHash,
        commitMessage: unprocessedCommits[index]!.commitMessage,
        commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
        commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
        commitDate: unprocessedCommits[index]!.commitDate,
        summary: summary
      }
    })
  })

  return commits
}