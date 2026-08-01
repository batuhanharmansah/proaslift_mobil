// 🛠️ TASK UTILITIES
// İş sıralama, gruplama ve filtreleme yardımcı fonksiyonları

export interface Task {
  id: string | number;
  scheduled_date: string | Date;
  scheduled_time?: string;
  status?: string;
  priority?: string;
  is_overdue?: boolean;
  [key: string]: any;
}

export interface GroupedTasks {
  today: Task[];
  upcoming: Task[]; // Bugünden sonra 3 gün içinde
  later: Task[]; // 3 günden sonra
  overdue: Task[];
}

export interface TaskPriority {
  urgent: Task[];
  high: Task[];
  normal: Task[];
  low: Task[];
}

// ==================== TASK SORTING ====================
export const sortTasksByDate = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.scheduled_date);
    const dateB = new Date(b.scheduled_date);
    
    // Önce bugünün tarihi varsa
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isTodayA = dateA.toDateString() === today.toDateString();
    const isTodayB = dateB.toDateString() === today.toDateString();
    
    if (isTodayA && !isTodayB) return -1;
    if (!isTodayA && isTodayB) return 1;
    
    // Sonra zamanına göre sırala (eğer varsa)
    if (a.scheduled_time && b.scheduled_time) {
      const [hoursA, minutesA] = a.scheduled_time.split(':').map(Number);
      const [hoursB, minutesB] = b.scheduled_time.split(':').map(Number);
      
      const timeA = hoursA * 60 + minutesA;
      const timeB = hoursB * 60 + minutesB;
      
      if (timeA !== timeB) {
        return timeA - timeB;
      }
    }
    
    // Son olarak tarihine göre sırala
    return dateA.getTime() - dateB.getTime();
  });
};

// ==================== TASK GROUPING ====================
export const groupTasksByDate = (tasks: Task[]): GroupedTasks => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  
  const grouped: GroupedTasks = {
    today: [],
    upcoming: [],
    later: [],
    overdue: [],
  };
  
  tasks.forEach((task) => {
    const taskDate = new Date(task.scheduled_date);
    taskDate.setHours(0, 0, 0, 0);
    
    // Gecikmiş işler
    if (task.is_overdue || taskDate < today) {
      grouped.overdue.push(task);
      return;
    }
    
    // Bugünün işleri
    if (taskDate.toDateString() === today.toDateString()) {
      grouped.today.push(task);
      return;
    }
    
    // Yaklaşan işler (3 gün içinde)
    if (taskDate <= threeDaysLater) {
      grouped.upcoming.push(task);
      return;
    }
    
    // Sonraki işler
    grouped.later.push(task);
  });
  
  // Her grubu sırala
  grouped.today = sortTasksByDate(grouped.today);
  grouped.upcoming = sortTasksByDate(grouped.upcoming);
  grouped.later = sortTasksByDate(grouped.later);
  grouped.overdue = sortTasksByDate(grouped.overdue);
  
  return grouped;
};

// ==================== TASK PRIORITY GROUPING ====================
export const groupTasksByPriority = (tasks: Task[]): TaskPriority => {
  const grouped: TaskPriority = {
    urgent: [],
    high: [],
    normal: [],
    low: [],
  };
  
  tasks.forEach((task) => {
    const priority = (task.priority || 'normal').toLowerCase();
    
    if (priority === 'urgent' || priority === 'critical') {
      grouped.urgent.push(task);
    } else if (priority === 'high') {
      grouped.high.push(task);
    } else if (priority === 'low') {
      grouped.low.push(task);
    } else {
      grouped.normal.push(task);
    }
  });
  
  // Her grubu sırala
  Object.keys(grouped).forEach((key) => {
    grouped[key as keyof TaskPriority] = sortTasksByDate(
      grouped[key as keyof TaskPriority]
    );
  });
  
  return grouped;
};

// ==================== CHECK IF TASK IS TODAY ====================
export const isTaskToday = (task: Task): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(task.scheduled_date);
  taskDate.setHours(0, 0, 0, 0);
  
  return taskDate.toDateString() === today.toDateString();
};

// ==================== CHECK IF TASK IS URGENT ====================
export const isTaskUrgent = (task: Task): boolean => {
  // Öncelik kontrolü
  const priority = (task.priority || 'normal').toLowerCase();
  if (priority === 'urgent' || priority === 'critical') {
    return true;
  }
  
  // Bugünün işleri acil sayılır
  if (isTaskToday(task)) {
    return true;
  }
  
  // 3 saatten az kalan işler acil sayılır
  if (task.scheduled_time) {
    const taskDate = new Date(task.scheduled_date);
    const [hours, minutes] = task.scheduled_time.split(':').map(Number);
    taskDate.setHours(hours || 0, minutes || 0, 0, 0);
    
    const now = new Date();
    const diff = taskDate.getTime() - now.getTime();
    const hoursRemaining = diff / (1000 * 60 * 60);
    
    if (hoursRemaining > 0 && hoursRemaining < 3) {
      return true;
    }
  }
  
  return false;
};

// ==================== GET PRIORITY COLOR ====================
export const getPriorityColor = (task: Task): string => {
  if (isTaskUrgent(task)) {
    return '#ef4444'; // error[500]
  }
  
  if (isTaskToday(task)) {
    return '#f59e0b'; // warning[500]
  }
  
  const priority = (task.priority || 'normal').toLowerCase();
  if (priority === 'high') {
    return '#f59e0b'; // warning[500]
  }
  
  return '#10b981'; // success[500]
};
