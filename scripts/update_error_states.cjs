const fs = require('fs');

function updateFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content, 'utf8');
}

// 1. ActivitiesPage.tsx
updateFile('src/pages/activities/ActivitiesPage.tsx', (content) => {
  // Ensure authStorage is imported
  if (!content.includes('authStorage')) {
    content = content.replace("from '@/lib/api';", "from '@/lib/api';\nimport { authStorage } from '@/lib/api';");
  }

  // Replace error block
  const oldErrorRegex = /if \(isActivitiesError\) \{[\s\S]*?return \([\s\S]*?<Button size="sm" onClick=\{\(\) => refetchActivities\(\)\}>[\s\S]*?<\/Button>[\s\S]*?\);[\s\S]*?\}/;
  const newErrorBlock = `if (isActivitiesError) {
    const isSessionExpired =
      (activitiesError as any)?.status === 401 ||
      (activitiesError instanceof Error && activitiesError.message.toLowerCase().includes('session'));

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 text-center">
        <AlertCircle className={cn('h-10 w-10', isSessionExpired ? 'text-amber-500' : 'text-red-500')} />
        <h3 className="text-base font-semibold text-txt-primary">
          {isSessionExpired ? 'Session Expired' : 'Failed to load activities'}
        </h3>
        <p className="text-xs text-txt-muted max-w-sm">
          {isSessionExpired
            ? 'Your login session has expired. Please sign in again to access activities.'
            : activitiesError instanceof Error
            ? activitiesError.message
            : 'Network error loading activities from PostgreSQL backend.'}
        </p>
        {isSessionExpired ? (
          <Button
            size="sm"
            className="bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
            onClick={() => {
              authStorage.clearSession();
              window.location.href = '/login?expired=1';
            }}
          >
            Sign In Again
          </Button>
        ) : (
          <Button size="sm" onClick={() => refetchActivities()}>
            Try Again
          </Button>
        )}
      </div>
    );
  }`;

  return content.replace(oldErrorRegex, newErrorBlock);
});

console.log('ActivitiesPage updated');

// 2. MeetingsPage.tsx
updateFile('src/pages/meetings/MeetingsPage.tsx', (content) => {
  if (!content.includes('authStorage')) {
    content = content.replace("from '@/lib/api';", "from '@/lib/api';\nimport { authStorage } from '@/lib/api';");
  }

  const oldErrorRegex = /if \(isMeetingsError\) \{[\s\S]*?return \([\s\S]*?<Button size="sm" onClick=\{\(\) => refetchMeetings\(\)\}>[\s\S]*?<\/Button>[\s\S]*?\);[\s\S]*?\}/;
  const newErrorBlock = `if (isMeetingsError) {
    const isSessionExpired =
      (meetingsError as any)?.status === 401 ||
      (meetingsError instanceof Error && meetingsError.message.toLowerCase().includes('session'));

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 text-center">
        <AlertCircle className={cn('h-10 w-10', isSessionExpired ? 'text-amber-500' : 'text-red-500')} />
        <h3 className="text-base font-semibold text-txt-primary">
          {isSessionExpired ? 'Session Expired' : 'Failed to load meetings'}
        </h3>
        <p className="text-xs text-txt-muted max-w-sm">
          {isSessionExpired
            ? 'Your login session has expired. Please sign in again to access meetings.'
            : meetingsError instanceof Error
            ? meetingsError.message
            : 'Network error loading meetings from PostgreSQL backend.'}
        </p>
        {isSessionExpired ? (
          <Button
            size="sm"
            className="bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
            onClick={() => {
              authStorage.clearSession();
              window.location.href = '/login?expired=1';
            }}
          >
            Sign In Again
          </Button>
        ) : (
          <Button size="sm" onClick={() => refetchMeetings()}>
            Try Again
          </Button>
        )}
      </div>
    );
  }`;

  return content.replace(oldErrorRegex, newErrorBlock);
});

console.log('MeetingsPage updated');

// 3. TasksPage.tsx
updateFile('src/pages/tasks/TasksPage.tsx', (content) => {
  if (!content.includes('authStorage')) {
    content = content.replace("from '@/lib/api';", "from '@/lib/api';\nimport { authStorage } from '@/lib/api';");
  }

  const oldErrorRegex = /if \(isTasksError\) \{[\s\S]*?return \([\s\S]*?<Button size="sm" onClick=\{\(\) => refetchTasks\(\)\}>[\s\S]*?<\/Button>[\s\S]*?\);[\s\S]*?\}/;
  const newErrorBlock = `if (isTasksError) {
    const isSessionExpired =
      (tasksError as any)?.status === 401 ||
      (tasksError instanceof Error && tasksError.message.toLowerCase().includes('session'));

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 p-6 text-center">
        <AlertCircle className={cn('h-10 w-10', isSessionExpired ? 'text-amber-500' : 'text-red-500')} />
        <h3 className="text-base font-semibold text-txt-primary">
          {isSessionExpired ? 'Session Expired' : 'Failed to load tasks'}
        </h3>
        <p className="text-xs text-txt-muted max-w-sm">
          {isSessionExpired
            ? 'Your login session has expired. Please sign in again to access tasks.'
            : tasksError instanceof Error
            ? tasksError.message
            : 'Network error loading tasks from PostgreSQL backend.'}
        </p>
        {isSessionExpired ? (
          <Button
            size="sm"
            className="bg-[#57B71B] hover:bg-[#469815] text-white cursor-pointer"
            onClick={() => {
              authStorage.clearSession();
              window.location.href = '/login?expired=1';
            }}
          >
            Sign In Again
          </Button>
        ) : (
          <Button size="sm" onClick={() => refetchTasks()}>
            Try Again
          </Button>
        )}
      </div>
    );
  }`;

  return content.replace(oldErrorRegex, newErrorBlock);
});

console.log('TasksPage updated');
