import { getViewer } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { getCourseOverview } from '@/services/course.service';
import { getStudyOverview } from '@/services/study.service';
import { getContinueLearning } from '@/services/progress.service';
import { getTodayTasks } from '@/services/task.service';
import { getQuoteOfTheDay } from '@/services/quote.service';
import { getSubjectOptions } from '@/services/subject.service';
import { getReadinessSnapshot } from '@/services/analytics.service';
import { MotivationCard } from '@/components/dashboard/motivation-card';
import { CourseCompletionCard } from '@/components/dashboard/course-completion-card';
import { StudyTodayCard } from '@/components/dashboard/study-today-card';
import { ContinueCard } from '@/components/dashboard/continue-card';
import { ReadinessCard } from '@/components/dashboard/readiness-card';
import { TaskList } from '@/components/dashboard/task-list';
import { greetingFor, todayKey } from '@/lib/utils/dates';

export default async function HomePage() {
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const today = todayKey(viewer.timezone);

  const [overview, study, continueItems, tasks, quote, subjects] = await Promise.all([
    getCourseOverview(supabase),
    getStudyOverview(supabase, viewer),
    getContinueLearning(supabase),
    getTodayTasks(supabase, today),
    getQuoteOfTheDay(supabase, today, viewer.settings.preferred_language),
    getSubjectOptions(supabase),
  ]);
  const analysis = await getReadinessSnapshot(supabase, viewer, overview.percent);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Home</h1>
      <MotivationCard quote={quote} greeting={greetingFor(viewer.timezone)} name={viewer.displayName} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CourseCompletionCard overview={overview} />
        <StudyTodayCard study={study} />
        <ReadinessCard analysis={analysis} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ContinueCard items={continueItems} />
        <TaskList tasks={tasks} subjects={subjects} today={today} />
      </div>
    </div>
  );
}
