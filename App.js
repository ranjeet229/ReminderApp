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
} from 'react-native';

// Simple text-based icons component
const Icon = ({ name, size = 24, color = '#000' }) => {
  const iconMap = {
    'bell': '🔔',
    'plus': '+',
    'check': '✓',
    'x': '✕',
    'edit-3': '✏️',
    'trash-2': '🗑️',
    'calendar': '📋',
    'clock': '⏰',
    'alert-circle': '⚠️',
    'star': '⭐',
    'filter': '🔍',
    'chevron-down': '▼',
    'chevron-up': '▲',
  };
  
  const icon = iconMap[name] || '•';
  
  return (
    <Text style={{ fontSize: size * 0.8, color, textAlign: 'center', minWidth: size }}>
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
    dueDate: ''
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
  const [selectedDate, setSelectedDate] = useState(new Date());

  const categories = [
    { id: 'personal', name: 'Personal', color: '#007AFF' },
    { id: 'work', name: 'Work', color: '#FF9500' },
    { id: 'health', name: 'Health', color: '#34C759' },
    { id: 'shopping', name: 'Shopping', color: '#AF52DE' },
    { id: 'family', name: 'Family', color: '#FF2D92' }
  ];

  const priorities = [
    { id: 'low', name: 'Low', color: '#8E8E93' },
    { id: 'medium', name: 'Medium', color: '#FF9500' },
    { id: 'high', name: 'High', color: '#FF3B30' }
  ];

  // Check for today's pending reminders
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysPending = reminders.filter(r => 
      !r.completed && 
      r.dueDate === today
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
      completed: false,
      createdAt: new Date().toLocaleDateString()
    };
    
    setReminders([reminder, ...reminders]);
    setNewReminder({
      text: '',
      category: 'personal',
      priority: 'medium',
      dueDate: ''
    });
    setShowAddModal(false);
  };

  const toggleComplete = (id) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id 
        ? { ...reminder, completed: !reminder.completed }
        : reminder
    ));
  };

  const deleteReminder = (id) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setReminders(reminders.filter(reminder => reminder.id !== id));
          }
        }
      ]
    );
  };

  const startEditing = (reminder) => {
    setEditingId(reminder.id);
    setEditingReminder({ ...reminder });
  };

  const saveEdit = () => {
    if (editingReminder.text.trim() === '') {
      Alert.alert('Error', 'Reminder text cannot be empty');
      return;
    }
    
    setReminders(reminders.map(reminder => 
      reminder.id === editingId 
        ? { ...editingReminder, text: editingReminder.text.trim() }
        : reminder
    ));
    setEditingId(null);
    setEditingReminder({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingReminder({});
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#007AFF';
  };

  const getPriorityColor = (priorityId) => {
    const priority = priorities.find(p => p.id === priorityId);
    return priority ? priority.color : '#8E8E93';
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const isDueToday = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  };

  const filteredReminders = reminders.filter(reminder => {
    if (filterCategory !== 'all' && reminder.category !== filterCategory) return false;
    if (filterPriority !== 'all' && reminder.priority !== filterPriority) return false;
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

  const todaysPendingReminders = reminders.filter(r => 
    !r.completed && isDueToday(r.dueDate)
  );

  const completedCount = reminders.filter(r => r.completed).length;
  const totalCount = reminders.length;

  const CategoryPicker = ({ visible, onClose, selectedValue, onSelect }) => (
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
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pickerItem,
                  selectedValue === cat.id && styles.pickerItemSelected
                ]}
                onPress={() => {
                  onSelect(cat.id);
                  onClose();
                }}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={styles.pickerItemText}>{cat.name}</Text>
                {selectedValue === cat.id && <Icon name="check" size={16} color="#007AFF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const PriorityPicker = ({ visible, onClose, selectedValue, onSelect }) => (
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
            {priorities.map(pri => (
              <TouchableOpacity
                key={pri.id}
                style={[
                  styles.pickerItem,
                  selectedValue === pri.id && styles.pickerItemSelected
                ]}
                onPress={() => {
                  onSelect(pri.id);
                  onClose();
                }}
              >
                <View style={[styles.priorityDot, { backgroundColor: pri.color }]} />
                <Text style={styles.pickerItemText}>{pri.name}</Text>
                {selectedValue === pri.id && <Icon name="check" size={16} color="#007AFF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const today = new Date();
    
    const handleDateSelect = (day) => {
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
      const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const isSelected = tempDate && 
          tempDate.getDate() === day && 
          tempDate.getMonth() === currentMonth && 
          tempDate.getFullYear() === currentYear;
        
        const isToday = today.getDate() === day && 
          today.getMonth() === currentMonth && 
          today.getFullYear() === currentYear;

        days.push(
          <TouchableOpacity
            key={day}
            style={[
              styles.calendarDay,
              isSelected && styles.selectedDay,
              isToday && !isSelected && styles.todayDay
            ]}
            onPress={() => handleDateSelect(day)}
          >
            <Text style={[
              styles.calendarDayText,
              isSelected && styles.selectedDayText,
              isToday && !isSelected && styles.todayDayText
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
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
              <TouchableOpacity style={styles.monthNavButton} onPress={prevMonth}>
                <Icon name="chevron-up" size={20} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {months[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity style={styles.monthNavButton} onPress={nextMonth}>
                <Icon name="chevron-down" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

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
                You have <Text style={styles.boldText}>{todaysPendingReminders.length}</Text> reminder
                {todaysPendingReminders.length !== 1 ? 's' : ''} due today. 
                Complete them before end of day! 🎯
              </Text>
              
              <ScrollView style={styles.todaysReminders} showsVerticalScrollIndicator={false}>
                {todaysPendingReminders.map((reminder, index) => (
                  <View key={reminder.id} style={styles.todayReminderItem}>
                    <View style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(reminder.category) }
                    ]} />
                    <Text style={styles.todayReminderText}>
                      {index + 1}. {reminder.text}
                    </Text>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(reminder.priority) }
                    ]}>
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
                <Text style={styles.gotItButtonText}>Got it! Let's do this! 💪</Text>
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
            <Text style={styles.headerTitle}>Smart Reminders</Text>
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
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.filterText}>
                {filterCategory === 'all' ? 'All Categories' : 
                 categories.find(c => c.id === filterCategory)?.name}
              </Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowPriorityPicker(true)}
            >
              <Text style={styles.filterText}>
                {filterPriority === 'all' ? 'All Priorities' : 
                 priorities.find(p => p.id === filterPriority)?.name}
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
              {reminders.length === 0 ? 'No reminders yet' : 'No matching reminders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {reminders.length === 0 
                ? 'Tap the + button to add your first reminder'
                : 'Try adjusting your filters or add a new reminder'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sortedReminders.map((reminder) => (
              <View key={reminder.id} style={[
                styles.reminderItem,
                reminder.completed && styles.completedItem,
                isOverdue(reminder.dueDate) && !reminder.completed && styles.overdueItem,
                isDueToday(reminder.dueDate) && !reminder.completed && styles.dueTodayItem
              ]}>
                <TouchableOpacity 
                  style={styles.checkButton}
                  onPress={() => toggleComplete(reminder.id)}
                >
                  <View style={[
                    styles.checkbox,
                    reminder.completed && styles.checkedBox
                  ]}>
                    {reminder.completed && <Icon name="check" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>

                <View style={styles.reminderContent}>
                  {editingId === reminder.id ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingReminder.text}
                        onChangeText={(text) => setEditingReminder({...editingReminder, text})}
                        multiline
                        autoFocus
                      />
                      <View style={styles.editRow}>
                        <TouchableOpacity 
                          style={styles.editSelect}
                          onPress={() => setShowCategoryPicker(true)}
                        >
                          <Text style={styles.editSelectText}>
                            {categories.find(c => c.id === editingReminder.category)?.name}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.editSelect}
                          onPress={() => setShowPriorityPicker(true)}
                        >
                          <Text style={styles.editSelectText}>
                            {priorities.find(p => p.id === editingReminder.priority)?.name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.editInput}
                        value={editingReminder.dueDate || ''}
                        onChangeText={(date) => setEditingReminder({...editingReminder, dueDate: date})}
                        placeholder="YYYY-MM-DD"
                      />
                      <View style={styles.editButtons}>
                        <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                          <Icon name="check" size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                          <Icon name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.reminderHeader}>
                        <View style={styles.reminderMeta}>
                          <View style={[
                            styles.categoryBadge,
                            { backgroundColor: getCategoryColor(reminder.category) }
                          ]}>
                            <Text style={styles.categoryBadgeText}>
                              {categories.find(c => c.id === reminder.category)?.name}
                            </Text>
                          </View>
                          <View style={[
                            styles.priorityIndicator,
                            { backgroundColor: getPriorityColor(reminder.priority) }
                          ]}>
                            {reminder.priority === 'high' && 
                              <Icon name="star" size={12} color="#fff" />
                            }
                          </View>
                        </View>
                        {reminder.dueDate && (
                          <View style={styles.dueDateContainer}>
                            {isOverdue(reminder.dueDate) && !reminder.completed && (
                              <Text style={styles.overdueText}>OVERDUE</Text>
                            )}
                            {isDueToday(reminder.dueDate) && !reminder.completed && (
                              <Text style={styles.todayText}>DUE TODAY</Text>
                            )}
                            <Text style={[
                              styles.dueDateText,
                              isOverdue(reminder.dueDate) && !reminder.completed && {color: '#FF3B30'},
                              isDueToday(reminder.dueDate) && !reminder.completed && {color: '#FF9500', fontWeight: 'bold'}
                            ]}>
                              {new Date(reminder.dueDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.reminderText,
                        reminder.completed && styles.completedText
                      ]}>
                        {reminder.text}
                      </Text>
                      <Text style={styles.dateText}>Created: {reminder.createdAt}</Text>
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
                  dueDate: ''
                });
              }}
            >
              <Text style={styles.modalButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TouchableOpacity onPress={addReminder}>
              <Text style={[styles.modalButton, styles.saveModalButton]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.modalInput}
              placeholder="What would you like to be reminded about?"
              value={newReminder.text}
              onChangeText={(text) => setNewReminder({...newReminder, text})}
              multiline
              autoFocus
            />
            
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowCategoryPicker(true)}
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
                  onPress={() => setShowPriorityPicker(true)}
                >
                  <Text style={styles.selectText}>
                    {priorities.find(p => p.id === newReminder.priority)?.name}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Due Date (optional)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  // Parse the existing date string properly
                  let initialDate = new Date();
                  if (newReminder.dueDate) {
                    // Create date from YYYY-MM-DD format at noon to avoid timezone issues
                    const [year, month, day] = newReminder.dueDate.split('-').map(Number);
                    initialDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                  }
                  setSelectedDate(initialDate);
                  setShowDatePicker(true);
                }}
              >
                <Text style={[
                  styles.dateButtonText,
                  !newReminder.dueDate && styles.placeholderText
                ]}>
                  {newReminder.dueDate 
                    ? new Date(newReminder.dueDate).toLocaleDateString()
                    : 'Select date'
                  }
                </Text>
                <Icon name="calendar" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      <DatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          if (date) {
            // Format date as YYYY-MM-DD to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            setNewReminder({...newReminder, dueDate: dateString});
          } else {
            setNewReminder({...newReminder, dueDate: ''});
          }
        }}
      />

      {/* Category Picker */}
      <CategoryPicker
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        selectedValue={editingId ? editingReminder.category : newReminder.category}
        onSelect={(value) => {
          if (editingId) {
            setEditingReminder({...editingReminder, category: value});
          } else {
            setNewReminder({...newReminder, category: value});
          }
        }}
      />

      {/* Priority Picker */}
      <PriorityPicker
        visible={showPriorityPicker}
        onClose={() => setShowPriorityPicker(false)}
        selectedValue={editingId ? editingReminder.priority : newReminder.priority}
        onSelect={(value) => {
          if (editingId) {
            setEditingReminder({...editingReminder, priority: value});
          } else {
            setNewReminder({...newReminder, priority: value});
          }
        }}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  todayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayAlertText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    backgroundColor: '#fff',
    marginLeft: 12,
    minWidth: 120,
  },
  filterText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  reminderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completedItem: {
    opacity: 0.7,
  },
  overdueItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  dueTodayItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    backgroundColor: '#FFFBF5',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  priorityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dueDateContainer: {
    alignItems: 'flex-end',
  },
  overdueText: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  todayText: {
    fontSize: 10,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  dueDateText: {
    fontSize: 12,
    color: '#666',
  },
  reminderText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 16,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  editRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  editSelect: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    marginRight: 8,
  },
  editSelectText: {
    fontSize: 14,
    color: '#000',
  },
  editButtons: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    lineHeight: 20,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
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
    padding: 20,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    backgroundColor: '#fff',
  },
  selectText: {
    fontSize: 16,
    color: '#000',
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  messageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  messageModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
    maxHeight: '80%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFF9E6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FF9500',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
    flex: 1,
    textAlign: 'center',
  },
  messageContent: {
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
  },
  todaysReminders: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 200,
  },
  todayReminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  todayReminderText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  gotItButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  pickerContent: {
    paddingHorizontal: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 400,
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
    minWidth: 44,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  calendarDay: {
    width: `${100/7}%`,
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
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#000',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontWeight: '600',
  },
  pickerSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default ReminderApp;