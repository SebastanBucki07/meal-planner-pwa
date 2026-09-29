import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WeekDay {
  date: Date;
  name: string;
  dayNumber: string;
  monthNumber: string;
  dateString: string;
  isSelected: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-planner-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planner-calendar.component.html',
  styleUrl: './planner-calendar.component.scss'
})
export class PlannerCalendarComponent {
  weekDays = input.required<WeekDay[]>();
  weekRange = input.required<string>();

  daySelected = output<string>();
  prevWeek = output<void>();
  nextWeek = output<void>();
  todayClicked = output<void>();
}
