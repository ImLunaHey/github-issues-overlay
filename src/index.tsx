import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type RestResponse = {
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  labels: any[];
  state: string;
  locked: boolean;
  assignee: null | any;
  assignees: any[];
  milestone: null | any;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: null | string;
  author_association: string;
  active_lock_reason: null | string;
  body: string;
  reactions: {
    url: string;
    total_count: number;
    "+1": number;
    "-1": number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  timeline_url: string;
  performed_via_github_app: null | any;
  state_reason: null | string;
}[];

type GithubIssue = {
  title: string;
  user: {
    name: string;
    avatar: string;
  }
  reactions: {
    total_count: number;
    upvote: number;
    downvote: number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  }
};

const getIssues = async (username: string, repo: string) => {
  const result = await fetch(`https://api.github.com/repos/${username}/${repo}/issues`);
  const issues = await result.json() as RestResponse;
  return issues
    .filter(issue => issue.state === 'open')
    .map(issue => ({
      title: issue.title,
      user: { name: issue.user.login, avatar: issue.user.avatar_url },
      reactions: {
        total_count: issue.reactions.total_count,
        upvote: issue.reactions['+1'],
        downvote: issue.reactions['-1'],
        laugh: issue.reactions.laugh,
        hooray: issue.reactions.hooray,
        confused: issue.reactions.confused,
        heart: issue.reactions.heart,
        rocket: issue.reactions.rocket,
        eyes: issue.reactions.eyes,
      }
    } satisfies GithubIssue));
};

const Issue: React.FC<GithubIssue> = ({ title, user, reactions }) => {
  return <div style={{
    padding: '5px',
    background: '#222',
    marginBottom: '5px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
  }}>{title} <img src={user.avatar} /> [{user.name}] - {'⬆'} {reactions.upvote} {'⬇'} {reactions.downvote}</div>;
};

const Issues: React.FC<{ issues: GithubIssue[] }> = ({ issues }) => issues.map((props) => <Issue {...props} />);

const App: React.FC<{ issues: GithubIssue[] }> = ({ issues }) => {
  return <html lang="en">
    <head>
      <title>Github issues overlay</title>
      <style>
        {`
          body {
            background: black;
            color: white;
          }
          img {
            width: 25px;
          }
        `}
      </style>
    </head>
    <body>
      <main>
        <Issues issues={issues} />
      </main>
    </body>
  </html>
};

Bun.serve({
  port: process.env.PORT ?? 3000,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const [, username, repo] = pathname.split("/");
    if (!username || !repo)
      return new Response("404 Not Found", {
        status: 404,
        headers: {
          "content-type": "text/html",
        },
      });

    const issues = await getIssues(username, repo);
    return new Response('<!doctype html>' + renderToStaticMarkup(<App issues={issues} />), {
      headers: {
        "content-type": "text/html",
      },
    });
  },
});
