import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Dimensions,
  PermissionsAndroid,
  Platform,
  AppState,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Simple text-based icons component
const Icon = ({ name, size = 24, color = '#000' }) => {
  const iconMap = {
    bell: '🔔',
    plus: '+',
    check: '✓',
    x: '✕',
    'edit-3': '✏️',
    'trash-2': '🗑️',
    calendar: '📋',
    clock: '⏰',
    'alert-circle': '⚠️',
    star: '⭐',
    filter: '🔍',
    'chevron-down': '▼',
    'chevron-up': '▲',
  };

  const icon = iconMap[name] || '•';

  return (
    <Text
      style={{
        fontSize: size * 0.8,
        color,
        textAlign: 'center',
        minWidth: size,
      }}
    >
      {icon}
    </Text>
  );
};

const { width } = Dimensions.get('window');

const ReminderApp = () => {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    text: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editingReminder, setEditingReminder] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMessageOfDay, setShowMessageOfDay] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState({
    hours: new Date().getHours(),
    minutes: new Date().getMinutes(),
  });
  const [appState, setAppState] = useState(AppState.currentState);
  const [isFilterPickerForCategory, setIsFilterPickerForCategory] =
    useState(true);

  const categories = [
    { id: 'personal', name: 'Personal', color: '#007AFF' },
    { id: 'work', name: 'Work', color: '#FF9500' },
    { id: 'health', name: 'Health', color: '#34C759' },
    { id: 'shopping', name: 'Shopping', color: '#AF52DE' },
  ];

  const priorities = [
    { id: 'low', name: 'Low', color: '#8E8E93' },
    { id: 'medium', name: 'Medium', color: '#FF9500' },
    { id: 'high', name: 'High', color: '#FF3B30' },
  ];

  // Initialize push notifications
  useEffect(() => {
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'reminder-channel',
          channelName: 'Task Reminders',
          channelDescription: 'Notifications for pending tasks and reminders',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        created => console.log(`createChannel returned '${created}'`),
      );
    }

    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);

        // Handle notification actions
        if (notification.action === 'Mark Complete') {
          const reminderId = notification.userInfo?.reminderId;
          if (reminderId) {
            toggleComplete(reminderId);
          }
        } else if (notification.action === 'Snooze') {
          const reminderId = notification.userInfo?.reminderId;
          if (reminderId) {
            snoozeReminder(reminderId);
          }
        }

        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },
      onRegistrationError: function (err) {
        console.error(err.message, err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Request Android permissions
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }

    return () => {
      // Clean up any scheduled notifications on unmount
      PushNotification.cancelAllLocalNotifications();
    };
  }, []);

  // Handle app state changes to check for overdue reminders
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground, check for overdue reminders
        checkOverdueReminders();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [appState, reminders]);

  // Enhanced real-time notification checking
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkOverdueReminders();
    }, 10000); // Check every 10 seconds for more accuracy

    return () => clearInterval(checkInterval);
  }, [reminders]);

  // Enhanced overdue reminder checking
  const checkOverdueReminders = () => {
    const now = new Date();

    reminders.forEach(reminder => {
      if (
        !reminder.completed &&
        reminder.dueDate &&
        !reminder.notificationSent
      ) {
        const dueDateTime = new Date(
          `${reminder.dueDate}T${reminder.dueTime || '09:00'}:00`,
        );

        // Check if current time has passed the due time
        if (now >= dueDateTime) {
          sendOverdueNotification(reminder);
          // Mark as notification sent to avoid spam
          setReminders(prevReminders =>
            prevReminders.map(r =>
              r.id === reminder.id ? { ...r, notificationSent: true } : r,
            ),
          );
        }
      }
    });
  };

  const sendOverdueNotification = reminder => {
    const notificationId = parseInt(reminder.id);

    PushNotification.localNotification({
      id: notificationId,
      channelId: 'reminder-channel',
      title: 'Task Pending! ⚠️',
      message: `Your task is pending: ${reminder.text}`,
      bigText: `Task: ${reminder.text}\nCategory: ${
        reminder.category
      }\nPriority: ${reminder.priority.toUpperCase()}\n\nThis task was due and is still incomplete. Please complete it soon!`,
      subText: 'Overdue Task',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
      actions: ['Mark Complete', 'Snooze'],
      invokeApp: true,
      userInfo: {
        reminderId: reminder.id,
        type: 'overdue_reminder',
      },
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      priority: 'high',
      importance: 'high',
    });
  };

  const scheduleNotification = reminder => {
    if (reminder.dueDate) {
      const dueDateTime = new Date(
        `${reminder.dueDate}T${reminder.dueTime || '09:00'}:00`,
      );
      const now = new Date();

      if (dueDateTime.getTime() > now.getTime()) {
        const notificationId = parseInt(reminder.id);

        PushNotification.localNotificationSchedule({
          id: notificationId,
          channelId: 'reminder-channel',
          title: 'Task Reminder 📋',
          message: `Your task is due: ${reminder.text}`,
          bigText: `Task: ${reminder.text}\nCategory: ${
            reminder.category
          }\nPriority: ${reminder.priority.toUpperCase()}\n\nDon't forget to complete this task!`,
          subText: 'RemindMe',
          date: dueDateTime,
          allowWhileIdle: true,
          vibrate: true,
          vibration: 300,
          playSound: true,
          soundName: 'default',
          actions: ['Mark Complete', 'Snooze'],
          userInfo: {
            reminderId: reminder.id,
            type: 'scheduled_reminder',
          },
          largeIcon: 'ic_launcher',
          smallIcon: 'ic_notification',
          priority: 'high',
          importance: 'high',
        });
      } else {
        // If the time has already passed, immediately send overdue notification
        setTimeout(() => sendOverdueNotification(reminder), 1000);
      }
    }
  };

  const snoozeReminder = reminderId => {
    // Snooze for 10 minutes
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
    const notificationId = parseInt(reminderId);

    const reminder = reminders.find(r => r.id === reminderId);
    if (reminder) {
      PushNotification.localNotificationSchedule({
        id: notificationId + 1000, // Different ID for snooze
        channelId: 'reminder-channel',
        title: 'Snoozed Task Reminder 😴',
        message: `Your snoozed task is still pending: ${reminder.text}`,
        bigText: `This task was snoozed but still needs your attention!\n\nTask: ${
          reminder.text
        }\nCategory: ${
          reminder.category
        }\nPriority: ${reminder.priority.toUpperCase()}`,
        subText: 'Snoozed',
        date: snoozeTime,
        vibrate: true,
        playSound: true,
        actions: ['Mark Complete', 'Snooze'],
        userInfo: {
          reminderId: reminder.id,
          type: 'snoozed_reminder',
        },
      });
    }
  };

  // Check for today's pending reminders
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysPending = reminders.filter(
      r => !r.completed && r.dueDate === today,
    );

    if (todaysPending.length > 0) {
      const timer = setTimeout(() => setShowMessageOfDay(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [reminders]);

  const addReminder = () => {
    if (newReminder.text.trim() === '') {
      Alert.alert('Error', 'Please enter a reminder text');
      return;
    }

    const reminder = {
      id: Date.now().toString(),
      text: newReminder.text.trim(),
      category: newReminder.category,
      priority: newReminder.priority,
      dueDate: newReminder.dueDate,
      dueTime: newReminder.dueTime,
      completed: false,
      createdAt: new Date().toLocaleDateString(),
      notificationSent: false,
    };

    setReminders([reminder, ...reminders]);

    // Schedule notification if due date/time is set
    scheduleNotification(reminder);

    setNewReminder({
      text: '',
      category: 'personal',
      priority: 'medium',
      dueDate: '',
      dueTime: '',
    });
    setShowAddModal(false);

    // Show confirmation
    Alert.alert(
      'Reminder Added!',
      reminder.dueDate
        ? `Your reminder has been scheduled for ${new Date(
            reminder.dueDate,
          ).toLocaleDateString()}${
            reminder.dueTime ? ` at ${reminder.dueTime}` : ''
          }`
        : 'Your reminder has been added successfully',
    );
  };

  const toggleComplete = id => {
    setReminders(prevReminders =>
      prevReminders.map(reminder => {
        if (reminder.id === id) {
          const updatedReminder = {
            ...reminder,
            completed: !reminder.completed,
          };

          // Cancel scheduled notifications when marking as complete
          if (updatedReminder.completed) {
            PushNotification.cancelLocalNotifications({ id: parseInt(id) });
            PushNotification.cancelLocalNotifications({
              id: parseInt(id) + 1000,
            }); // Cancel snooze too
          } else {
            // Re-schedule notification if marking as incomplete
            scheduleNotification(updatedReminder);
          }

          return updatedReminder;
        }
        return reminder;
      }),
    );
  };

  const deleteReminder = id => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Cancel any scheduled notifications for this reminder
            PushNotification.cancelLocalNotifications({ id: parseInt(id) });
            PushNotification.cancelLocalNotifications({
              id: parseInt(id) + 1000,
            }); // Cancel snooze too

            setReminders(reminders.filter(reminder => reminder.id !== id));
          },
        },
      ],
    );
  };

  const startEditing = reminder => {
    setEditingId(reminder.id);
    setEditingReminder({ ...reminder });
  };

  const saveEdit = () => {
    if (editingReminder.text.trim() === '') {
      Alert.alert('Error', 'Reminder text cannot be empty');
      return;
    }

    setReminders(
      reminders.map(reminder => {
        if (reminder.id === editingId) {
          // Cancel old notifications
          PushNotification.cancelLocalNotifications({
            id: parseInt(editingId),
          });
          PushNotification.cancelLocalNotifications({
            id: parseInt(editingId) + 1000,
          });

          const updatedReminder = {
            ...editingReminder,
            text: editingReminder.text.trim(),
            notificationSent: false, // Reset notification status
          };

          // Reschedule if there's a due date
          if (updatedReminder.dueDate && !updatedReminder.completed) {
            scheduleNotification(updatedReminder);
          }

          return updatedReminder;
        }
        return reminder;
      }),
    );

    setEditingId(null);
    setEditingReminder({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingReminder({});
  };

  const getCategoryColor = categoryId => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#007AFF';
  };

  const getPriorityColor = priorityId => {
    const priority = priorities.find(p => p.id === priorityId);
    return priority ? priority.color : '#8E8E93';
  };

  const isOverdue = dueDate => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const isDueToday = dueDate => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  };

  // Fixed filtering logic
  const filteredReminders = reminders.filter(reminder => {
    if (filterCategory !== 'all' && reminder.category !== filterCategory)
      return false;
    if (filterPriority !== 'all' && reminder.priority !== filterPriority)
      return false;
    return true;
  });

  const sortedReminders = [...filteredReminders].sort((a, b) => {
    // Sort by completion status first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  const todaysPendingReminders = reminders.filter(
    r => !r.completed && isDueToday(r.dueDate),
  );

  const completedCount = reminders.filter(r => r.completed).length;
  const totalCount = reminders.length;

  // Fixed Category Picker with "All Categories" option
  const CategoryPicker = ({
    visible,
    onClose,
    selectedValue,
    onSelect,
    isForFilter = false,
  }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.pickerContent}>
            {isForFilter && (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedValue === 'all' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect('all');
                  onClose();
                }}
              >
                <View
                  style={[styles.categoryDot, { backgroundColor: '#8E8E93' }]}
                />
                <Text style={styles.pickerItemText}>All Categories</Text>
                {selectedValue === 'all' && (
                  <Icon name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pickerItem,
                  selectedValue === cat.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect(cat.id);
                  onClose();
                }}
              >
                <View
                  style={[styles.categoryDot, { backgroundColor: cat.color }]}
                />
                <Text style={styles.pickerItemText}>{cat.name}</Text>
                {selectedValue === cat.id && (
                  <Icon name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Fixed Priority Picker with "All Priorities" option
  const PriorityPicker = ({
    visible,
    onClose,
    selectedValue,
    onSelect,
    isForFilter = false,
  }) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Priority</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.pickerContent}>
            {isForFilter && (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedValue === 'all' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect('all');
                  onClose();
                }}
              >
                <View
                  style={[styles.priorityDot, { backgroundColor: '#8E8E93' }]}
                />
                <Text style={styles.pickerItemText}>All Priorities</Text>
                {selectedValue === 'all' && (
                  <Icon name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            {priorities.map(pri => (
              <TouchableOpacity
                key={pri.id}
                style={[
                  styles.pickerItem,
                  selectedValue === pri.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect(pri.id);
                  onClose();
                }}
              >
                <View
                  style={[styles.priorityDot, { backgroundColor: pri.color }]}
                />
                <Text style={styles.pickerItemText}>{pri.name}</Text>
                {selectedValue === pri.id && (
                  <Icon name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const TimePicker = ({ visible, onClose, selectedTime, onTimeSelect }) => {
    const [tempHours, setTempHours] = useState(selectedTime.hours);
    const [tempMinutes, setTempMinutes] = useState(selectedTime.minutes);

    useEffect(() => {
      if (visible) {
        setTempHours(selectedTime.hours);
        setTempMinutes(selectedTime.minutes);
      }
    }, [visible, selectedTime]);

    const handleSave = () => {
      onTimeSelect({ hours: tempHours, minutes: tempMinutes });
      onClose();
    };

    const formatTime = (hours, minutes) => {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const renderHours = () => {
      const hours = [];
      for (let i = 0; i < 24; i++) {
        hours.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.timePickerItem,
              tempHours === i && styles.selectedTimeItem,
            ]}
            onPress={() => setTempHours(i)}
          >
            <Text
              style={[
                styles.timePickerText,
                tempHours === i && styles.selectedTimeText,
              ]}
            >
              {i.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>,
        );
      }
      return hours;
    };

    const renderMinutes = () => {
      const minutes = [];
      for (let i = 0; i < 60; i += 5) {
        minutes.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.timePickerItem,
              tempMinutes === i && styles.selectedTimeItem,
            ]}
            onPress={() => setTempMinutes(i)}
          >
            <Text
              style={[
                styles.timePickerText,
                tempMinutes === i && styles.selectedTimeText,
              ]}
            >
              {i.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>,
        );
      }
      return minutes;
    };

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.pickerSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePreview}>
              <Text style={styles.timePreviewText}>
                {formatTime(tempHours, tempMinutes)}
              </Text>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnHeader}>Hour</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {renderHours()}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnHeader}>Minutes</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {renderMinutes()}
                </ScrollView>
              </View>
            </View>

            <View style={styles.timePickerActions}>
              <TouchableOpacity
                style={styles.clearTimeButton}
                onPress={() => {
                  onTimeSelect(null);
                  onClose();
                }}
              >
                <Text style={styles.clearTimeText}>Clear Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nowButton}
                onPress={() => {
                  const now = new Date();
                  setTempHours(now.getHours());
                  setTempMinutes(Math.floor(now.getMinutes() / 5) * 5);
                }}
              >
                <Text style={styles.nowButtonText}>Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const DatePicker = ({ visible, onClose, selectedDate, onDateSelect }) => {
    const [tempDate, setTempDate] = useState(selectedDate);
    const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

    useEffect(() => {
      if (visible) {
        const date = selectedDate || new Date();
        setTempDate(date);
        setCurrentMonth(date.getMonth());
        setCurrentYear(date.getFullYear());
      }
    }, [visible, selectedDate]);

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const today = new Date();

    const handleDateSelect = day => {
      const newDate = new Date(currentYear, currentMonth, day);
      setTempDate(newDate);
    };

    const handleSave = () => {
      onDateSelect(tempDate);
      onClose();
    };

    const nextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    };

    const prevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    };

    const renderCalendarDays = () => {
      const days = [];

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const isSelected =
          tempDate &&
          tempDate.getDate() === day &&
          tempDate.getMonth() === currentMonth &&
          tempDate.getFullYear() === currentYear;

        const isToday =
          today.getDate() === day &&
          today.getMonth() === currentMonth &&
          today.getFullYear() === currentYear;

        days.push(
          <TouchableOpacity
            key={day}
            style={[
              styles.calendarDay,
              isSelected && styles.selectedDay,
              isToday && !isSelected && styles.todayDay,
            ]}
            onPress={() => handleDateSelect(day)}
          >
            <Text
              style={[
                styles.calendarDayText,
                isSelected && styles.selectedDayText,
                isToday && !isSelected && styles.todayDayText,
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>,
        );
      }

      return days;
    };

    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.pickerSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={prevMonth}
              >
                <Icon name="chevron-up" size={20} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {months[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={nextMonth}
              >
                <Icon name="chevron-down" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => {
                  onDateSelect(null);
                  onClose();
                }}
              >
                <Text style={styles.clearDateText}>Clear Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = new Date();
                  setTempDate(today);
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      {/* Message of the Day Modal */}
      <Modal
        visible={showMessageOfDay && todaysPendingReminders.length > 0}
        transparent
        animationType="slide"
      >
        <View style={styles.messageOverlay}>
          <View style={styles.messageModal}>
            <View style={styles.messageHeader}>
              <Icon name="alert-circle" size={24} color="#FF9500" />
              <Text style={styles.messageTitle}>Today's Reminders</Text>
              <TouchableOpacity onPress={() => setShowMessageOfDay(false)}>
                <Icon name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.messageContent}>
              <Text style={styles.messageText}>
                You have{' '}
                <Text style={styles.boldText}>
                  {todaysPendingReminders.length}
                </Text>{' '}
                reminder
                {todaysPendingReminders.length !== 1 ? 's' : ''} due today.
                Complete them before end of day!
              </Text>

              <ScrollView
                style={styles.todaysReminders}
                showsVerticalScrollIndicator={false}
              >
                {todaysPendingReminders.map((reminder, index) => (
                  <View key={reminder.id} style={styles.todayReminderItem}>
                    <View
                      style={[
                        styles.categoryDot,
                        {
                          backgroundColor: getCategoryColor(reminder.category),
                        },
                      ]}
                    />
                    <Text style={styles.todayReminderText}>
                      {index + 1}. {reminder.text}
                    </Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: getPriorityColor(reminder.priority),
                        },
                      ]}
                    >
                      <Text style={styles.priorityBadgeText}>
                        {reminder.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.gotItButton}
                onPress={() => setShowMessageOfDay(false)}
              >
                <Text style={styles.gotItButtonText}>
                  Got it! Let's do this!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Icon name="bell" size={24} color="#fff" />
            <Text style={styles.headerTitle}>Remind Me</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {totalCount > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {completedCount} of {totalCount} completed
            </Text>
            {todaysPendingReminders.length > 0 && (
              <View style={styles.todayAlert}>
                <Icon name="clock" size={14} color="#FF9500" />
                <Text style={styles.todayAlertText}>
                  {todaysPendingReminders.length} due today
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Filters */}
      {reminders.length > 0 && (
        <View style={styles.filterContainer}>
          <View style={styles.filterGroup}>
            <Icon name="filter" size={16} color="#666" />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setIsFilterPickerForCategory(true);
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.filterText}>
                {filterCategory === 'all'
                  ? 'All Categories'
                  : categories.find(c => c.id === filterCategory)?.name}
              </Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setIsFilterPickerForCategory(false);
                setShowPriorityPicker(true);
              }}
            >
              <Text style={styles.filterText}>
                {filterPriority === 'all'
                  ? 'All Priorities'
                  : priorities.find(p => p.id === filterPriority)?.name}
              </Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sortedReminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>
              {reminders.length === 0
                ? 'No reminders yet'
                : 'No matching reminders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {reminders.length === 0
                ? 'Tap the + button to add your first reminder'
                : 'Try adjusting your filters or add a new reminder'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sortedReminders.map(reminder => (
              <View
                key={reminder.id}
                style={[
                  styles.reminderItem,
                  reminder.completed && styles.completedItem,
                  isOverdue(reminder.dueDate) &&
                    !reminder.completed &&
                    styles.overdueItem,
                  isDueToday(reminder.dueDate) &&
                    !reminder.completed &&
                    styles.dueTodayItem,
                ]}
              >
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => toggleComplete(reminder.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      reminder.completed && styles.checkedBox,
                    ]}
                  >
                    {reminder.completed && (
                      <Icon name="check" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.reminderContent}>
                  {editingId === reminder.id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingReminder.text}
                        onChangeText={text =>
                          setEditingReminder({ ...editingReminder, text })
                        }
                        multiline
                        autoFocus
                      />
                      <View style={styles.editRow}>
                        <TouchableOpacity
                          style={styles.editSelect}
                          onPress={() => {
                            setIsFilterPickerForCategory(true);
                            setShowCategoryPicker(true);
                          }}
                        >
                          <Text style={styles.editSelectText}>
                            {
                              categories.find(
                                c => c.id === editingReminder.category,
                              )?.name
                            }
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editSelect}
                          onPress={() => {
                            setIsFilterPickerForCategory(false);
                            setShowPriorityPicker(true);
                          }}
                        >
                          <Text style={styles.editSelectText}>
                            {
                              priorities.find(
                                p => p.id === editingReminder.priority,
                              )?.name
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.editInput}
                        value={editingReminder.dueDate || ''}
                        onChangeText={date =>
                          setEditingReminder({
                            ...editingReminder,
                            dueDate: date,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                      />
                      <View style={styles.editButtons}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={saveEdit}
                        >
                          <Icon name="check" size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={cancelEdit}
                        >
                          <Icon name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderMeta}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: getCategoryColor(
                                  reminder.category,
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.categoryBadgeText}>
                              {
                                categories.find(c => c.id === reminder.category)
                                  ?.name
                              }
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.priorityIndicator,
                              {
                                backgroundColor: getPriorityColor(
                                  reminder.priority,
                                ),
                              },
                            ]}
                          >
                            {reminder.priority === 'high' && (
                              <Icon name="star" size={12} color="#fff" />
                            )}
                          </View>
                        </View>
                        {reminder.dueDate && (
                          <View style={styles.dueDateContainer}>
                            {isOverdue(reminder.dueDate) &&
                              !reminder.completed && (
                                <Text style={styles.overdueText}>OVERDUE</Text>
                              )}
                            {isDueToday(reminder.dueDate) &&
                              !reminder.completed && (
                                <Text style={styles.todayText}>DUE TODAY</Text>
                              )}
                            <Text
                              style={[
                                styles.dueDateText,
                                isOverdue(reminder.dueDate) &&
                                  !reminder.completed && { color: '#FF3B30' },
                                isDueToday(reminder.dueDate) &&
                                  !reminder.completed && {
                                    color: '#FF9500',
                                    fontWeight: 'bold',
                                  },
                              ]}
                            >
                              {new Date(reminder.dueDate).toLocaleDateString()}
                              {reminder.dueTime && (
                                <Text style={styles.dueTimeText}>
                                  {' at '}
                                  {(() => {
                                    const [hours, minutes] = reminder.dueTime
                                      .split(':')
                                      .map(Number);
                                    const period = hours >= 12 ? 'PM' : 'AM';
                                    const displayHours =
                                      hours === 0
                                        ? 12
                                        : hours > 12
                                        ? hours - 12
                                        : hours;
                                    return `${displayHours}:${minutes
                                      .toString()
                                      .padStart(2, '0')} ${period}`;
                                  })()}
                                </Text>
                              )}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.reminderText,
                          reminder.completed && styles.completedText,
                        ]}
                      >
                        {reminder.text}
                      </Text>
                      <Text style={styles.dateText}>
                        Created: {reminder.createdAt}
                      </Text>
                    </>
                  )}
                </View>

                {editingId !== reminder.id && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => startEditing(reminder)}
                    >
                      <Icon name="edit-3" size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteReminder(reminder.id)}
                    >
                      <Icon name="trash-2" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                setNewReminder({
                  text: '',
                  category: 'personal',
                  priority: 'medium',
                  dueDate: '',
                  dueTime: '',
                });
              }}
            >
              <Text style={styles.modalButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TouchableOpacity onPress={addReminder}>
              <Text style={[styles.modalButton, styles.saveModalButton]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.modalInput}
              placeholder="What would you like to be reminded about?"
              value={newReminder.text}
              onChangeText={text => setNewReminder({ ...newReminder, text })}
              multiline
              autoFocus
            />

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    setShowCategoryPicker(true);
                  }}
                >
                  <Text style={styles.selectText}>
                    {categories.find(c => c.id === newReminder.category)?.name}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    setShowPriorityPicker(true);
                  }}
                >
                  <Text style={styles.selectText}>
                    {priorities.find(p => p.id === newReminder.priority)?.name}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (optional)</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    let initialDate = new Date();
                    if (newReminder.dueDate) {
                      const [year, month, day] = newReminder.dueDate
                        .split('-')
                        .map(Number);
                      initialDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                    }
                    setSelectedDate(initialDate);
                    setShowDatePicker(true);
                  }}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      !newReminder.dueDate && styles.placeholderText,
                    ]}
                  >
                    {newReminder.dueDate
                      ? new Date(newReminder.dueDate).toLocaleDateString()
                      : 'Select date'}
                  </Text>
                  <Icon name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Time (optional)</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    let initialTime = {
                      hours: new Date().getHours(),
                      minutes: new Date().getMinutes(),
                    };
                    if (newReminder.dueTime) {
                      const [hours, minutes] = newReminder.dueTime
                        .split(':')
                        .map(Number);
                      initialTime = { hours, minutes };
                    }
                    setSelectedTime(initialTime);
                    setShowTimePicker(true);
                  }}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      !newReminder.dueTime && styles.placeholderText,
                    ]}
                  >
                    {newReminder.dueTime
                      ? (() => {
                          const [hours, minutes] = newReminder.dueTime
                            .split(':')
                            .map(Number);
                          const period = hours >= 12 ? 'PM' : 'AM';
                          const displayHours =
                            hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                          return `${displayHours}:${minutes
                            .toString()
                            .padStart(2, '0')} ${period}`;
                        })()
                      : 'Select time'}
                  </Text>
                  <Icon name="clock" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Time Picker */}
      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        selectedTime={selectedTime}
        onTimeSelect={time => {
          if (time) {
            const timeString = `${time.hours
              .toString()
              .padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
            setNewReminder({ ...newReminder, dueTime: timeString });
          } else {
            setNewReminder({ ...newReminder, dueTime: '' });
          }
        }}
      />

      {/* Date Picker */}
      <DatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={date => {
          if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            setNewReminder({ ...newReminder, dueDate: dateString });
          } else {
            setNewReminder({ ...newReminder, dueDate: '' });
          }
        }}
      />

      {/* Category Picker with fixed filter support */}
      <CategoryPicker
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        selectedValue={
          editingId
            ? editingReminder.category
            : showAddModal
            ? newReminder.category
            : filterCategory
        }
        onSelect={value => {
          if (editingId) {
            setEditingReminder({ ...editingReminder, category: value });
          } else if (showAddModal) {
            setNewReminder({ ...newReminder, category: value });
          } else {
            setFilterCategory(value);
          }
        }}
        isForFilter={!editingId && !showAddModal}
      />

      {/* Priority Picker with fixed filter support */}
      <PriorityPicker
        visible={showPriorityPicker}
        onClose={() => setShowPriorityPicker(false)}
        selectedValue={
          editingId
            ? editingReminder.priority
            : showAddModal
            ? newReminder.priority
            : filterPriority
        }
        onSelect={value => {
          if (editingId) {
            setEditingReminder({ ...editingReminder, priority: value });
          } else if (showAddModal) {
            setNewReminder({ ...newReminder, priority: value });
          } else {
            setFilterPriority(value);
          }
        }}
        isForFilter={!editingId && !showAddModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  todayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayAlertText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  reminderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  completedItem: {
    opacity: 0.6,
    backgroundColor: '#F8F8F8',
  },
  overdueItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  dueTodayItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    backgroundColor: '#FFFAF0',
  },
  checkButton: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  priorityIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dueDateContainer: {
    alignItems: 'flex-end',
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 2,
  },
  todayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 2,
  },
  dueDateText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  dueTimeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reminderText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
    marginBottom: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },

  editContainer: {
    flex: 1,
  },
  editInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 8,
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  editSelect: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  editSelectText: {
    fontSize: 14,
    color: '#007AFF',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveModalButton: {
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  formGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  selectButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#000',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#C7C7CC',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width - 32,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#FF3B30',
  },
  pickerSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  pickerContent: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  pickerItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width - 32,
    maxHeight: '70%',
  },
  timePreview: {
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  timePreviewText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  timePickerContent: {
    flexDirection: 'row',
    height: 200,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumnHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    paddingVertical: 12,
  },
  timeScroll: {
    flex: 1,
    width: '100%',
  },
  timePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  selectedTimeItem: {
    backgroundColor: '#007AFF',
    marginHorizontal: 10,
    borderRadius: 8,
  },
  timePickerText: {
    fontSize: 18,
    color: '#000',
  },
  selectedTimeText: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8E8E93',
    alignSelf: 'center',
    marginTop: 40,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  clearTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearTimeText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  nowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  nowButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width - 32,
    maxHeight: '70%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  monthNavButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  todayDay: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#000',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayDayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  clearDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearDateText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  messageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width - 32,
    maxHeight: '60%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  messageContent: {
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
    color: '#FF9500',
  },
  todaysReminders: {
    maxHeight: 200,
    marginBottom: 20,
  },
  todayReminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  todayReminderText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  gotItButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ReminderApp;
