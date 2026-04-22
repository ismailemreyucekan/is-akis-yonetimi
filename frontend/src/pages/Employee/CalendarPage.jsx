import MyTasks from './MyTasks';

// Calendar page simply renders MyTasks with calendar view pre-selected
export default function CalendarPage() {
  return <MyTasks defaultView="calendar" />;
}
