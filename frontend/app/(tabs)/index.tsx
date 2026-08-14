import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodoEditModal } from '@/components/todo-edit-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Todo = {
  id: string;
  title: string;
  completed: boolean;

  deadline: number | null;
  alarmed: boolean;
  notificationId: string | null;

  imageUri?: string | null;

};

let nextId = 1;

const formatDeadline = (deadline: number) =>
  new Date(deadline).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const [query, setQuery] = useState('');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  const todosRef = useRef(todos);
  todosRef.current = todos;

  const alarmPlayer = useAudioPlayer(require('../../assets/sounds/alarm.wav'));
  const ringPlayer = useAudioPlayer(require('../../assets/sounds/ring.wav'));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({ light: '#F2F3F5', dark: '#1D1F20' }, 'background');
  const danger = colorScheme === 'dark' ? '#FF6B6B' : '#D0342C';

  const remaining = todos.filter((todo) => !todo.completed).length;

  // ponytail: filter on every keystroke, no debounce/useMemo. The list is in memory.
  // Debounce when it comes from an API, or memoise past a few thousand todos.
  const q = query.trim().toLowerCase();
  const visible = todos.filter((todo) => todo.title.toLowerCase().includes(q));

  const isOverdue = (todo: Todo) => !!todo.deadline && !todo.completed && todo.deadline <= Date.now();

  const playAlarm = () => {
    alarmPlayer.seekTo(0);
    alarmPlayer.play();
  };

  const playRing = () => {
    ringPlayer.seekTo(0);
    ringPlayer.play();
  };

  const ensureNotificationPermission = async (): Promise<boolean> => {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) {
      return true;
    }
    const request = await Notifications.requestPermissionsAsync();
    return request.granted;
  };

  const scheduleForTodo = async (todo: Todo): Promise<string | null> => {
    if (!todo.deadline) {
      return null;
    }
    const granted = await ensureNotificationPermission();
    if (!granted) {
      return null;
    }
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Todo deadline reached',
          body: `"${todo.title}" is not completed yet.`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: todo.deadline,
        },
      });
    } catch {
      return null;
    }
  };

  const cancelNotification = (id: string | null) => {
    if (id) {
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  };

  // Poll every second for any uncompleted todo that just passed its deadline.
  const hasPendingDeadline = todos.some((todo) => todo.deadline && !todo.completed && !todo.alarmed);

  useEffect(() => {
    if (!hasPendingDeadline) {
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      let fired = false;
      const next = todosRef.current.map((todo) => {
        if (todo.deadline && !todo.completed && !todo.alarmed && todo.deadline <= now) {
          fired = true;
          return { ...todo, alarmed: true };
        }
        return todo;
      });
      if (fired) {
        todosRef.current = next;
        setTodos(next);
        playAlarm();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingDeadline]);

  const addTodo = (title: string, deadline: number | null) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const todo: Todo = {
      id: String(nextId++),
      title: trimmed,
      completed: false,
      deadline,
      alarmed: false,
      notificationId: null,
    };
    setTodos((prev) => [todo, ...prev]);
    if (deadline) {
      scheduleForTodo(todo).then((notificationId) => {
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, notificationId } : t)));
      });
    }
  };

  const toggleTodo = (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) {
      return;
    }

    const nowCompleted = !target.completed;

    if (nowCompleted) {
      cancelNotification(target.notificationId);
      playRing();
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: true, notificationId: null, alarmed: false } : todo,
        ),
      );
      return;
    }

    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: false, alarmed: false } : todo)),
    );
    if (target.deadline) {
      scheduleForTodo({ ...target, completed: false }).then((notificationId) => {
        setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, notificationId } : todo)));
      });
    }
  };

  const saveTodo = async (id: string, newTitle: string, newDeadline: number | null) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) {
      return;
    }

    cancelNotification(target.notificationId);

    let notificationId: string | null = null;
    if (!target.completed && newDeadline) {
      notificationId = await scheduleForTodo({ ...target, title: newTitle, deadline: newDeadline });
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              title: newTitle,
              deadline: newDeadline,
              notificationId,
              alarmed: newDeadline && newDeadline > Date.now() ? false : todo.alarmed,
            }
          : todo,
      ),
    );
  };

  const deleteTodo = (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    cancelNotification(target?.notificationId ?? null);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const attachImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) {
      setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, imageUri: uri } : todo)));
    }
  };

  const removeImage = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, imageUri: null } : todo)));
  };

  const addButtonColor = colorScheme === 'dark' ? colors.background : '#fff';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
          <ThemedText type="title">Todos</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {remaining} of {todos.length} remaining
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.searchBar, { backgroundColor: surface }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search todos"
            placeholderTextColor={colors.icon}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search todos"
            style={[styles.searchField, { color: colors.text }]}
          />
        </ThemedView>

        {visible.length === 0 ? (
          <ThemedView style={styles.empty}>
            <IconSymbol name={q ? 'magnifyingglass' : 'checklist'} size={48} color={colors.icon} />
            <ThemedText style={{ color: colors.icon }}>
              {q ? `No todos match "${query.trim()}".` : 'No todos yet. Add one below.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {visible.map((todo) => (
              <ThemedView key={todo.id} style={[styles.todoRow, { backgroundColor: surface }]}>
                <View style={styles.todoTopRow}>
                <Pressable
                  onPress={() => toggleTodo(todo.id)}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: todo.completed }}
                  accessibilityLabel={`${todo.completed ? 'Unmark' : 'Mark'} ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}>
                  <IconSymbol
                    name={todo.completed ? 'checkmark.circle.fill' : 'circle'}
                    size={26}
                    color={todo.completed ? tint : colors.icon}
                  />
                </Pressable>
                <ThemedView style={styles.todoBody}>
                  <ThemedText
                    style={[styles.todoTitle, todo.completed && { color: colors.icon, textDecorationLine: 'line-through' }]}
                    numberOfLines={2}>
                    {todo.title}
                  </ThemedText>
                  {todo.deadline && (
                    <ThemedText style={[styles.deadlineText, { color: isOverdue(todo) ? danger : colors.icon }]}>
                      {isOverdue(todo) ? 'Overdue · ' : 'Due '}
                      {formatDeadline(todo.deadline)}
                    </ThemedText>
                  )}
                </ThemedView>
                {todo.completed && (
                  <Pressable
                    onPress={() => attachImage(todo.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Attach an image to ${todo.title}`}>
                    <IconSymbol name="photo" size={22} color={tint} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setEditing(todo)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${todo.title}`}>
                  <IconSymbol name="pencil" size={20} color={colors.icon} />
                </Pressable>
                <Pressable
                  onPress={() => deleteTodo(todo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${todo.title}`}>
                  <IconSymbol name="trash" size={22} color={colors.icon} />
                </Pressable>
                </View>
                {todo.imageUri ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: todo.imageUri }} style={styles.todoImage} contentFit="cover" />
                    <Pressable
                      onPress={() => removeImage(todo.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove image from ${todo.title}`}
                      style={styles.removeImage}>
                      <IconSymbol name="xmark.circle.fill" size={22} color={colors.icon} />
                    </Pressable>
                  </View>
                ) : null}
              </ThemedView>
            ))}
          </ScrollView>
        )}

        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          accessibilityLabel="Add a new todo"
          style={[styles.fab, { backgroundColor: tint }]}>
          <IconSymbol name="plus" size={28} color={addButtonColor} />
        </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>

      <TodoEditModal
        visible={creating || editing !== null}
        mode={editing ? 'edit' : 'create'}
        title={editing?.title ?? ''}
        deadline={editing?.deadline ?? null}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(title, deadline) => {
          if (editing) {
            saveTodo(editing.id, title, deadline);
          } else {
            addTodo(title, deadline);
          }
          setCreating(false);
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  searchField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  todoRow: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  todoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todoBody: {
    flex: 1,
    gap: 2,
  },
  todoTitle: {
    fontSize: 16,
  },

  deadlineText: {
    fontSize: 12,
  },
  imageContainer: {
    alignSelf: 'flex-start',
  },
  todoImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,

  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
