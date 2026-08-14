import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

let nextId = 1;

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({ light: '#F2F3F5', dark: '#1D1F20' }, 'background');

  const remaining = todos.filter((todo) => !todo.completed).length;

  const addTodo = () => {
    const title = input.trim();
    if (!title) {
      return;
    }
    setTodos((prev) => [{ id: String(nextId++), title, completed: false }, ...prev]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const addButtonColor = colorScheme === 'dark' ? colors.background : '#fff';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Todos</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {remaining} of {todos.length} remaining
          </ThemedText>
        </ThemedView>

        {todos.length === 0 ? (
          <ThemedView style={styles.empty}>
            <IconSymbol name="checklist" size={48} color={colors.icon} />
            <ThemedText style={{ color: colors.icon }}>No todos yet. Add one below.</ThemedText>
          </ThemedView>
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {todos.map((todo) => (
              <ThemedView key={todo.id} style={[styles.todoRow, { backgroundColor: surface }]}>
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
                <ThemedText
                  style={[styles.todoTitle, todo.completed && { color: colors.icon, textDecorationLine: 'line-through' }]}
                  numberOfLines={2}>
                  {todo.title}
                </ThemedText>
                <Pressable
                  onPress={() => deleteTodo(todo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${todo.title}`}>
                  <IconSymbol name="trash" size={22} color={colors.icon} />
                </Pressable>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={styles.inputBar}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addTodo}
              placeholder="Add a new todo"
              placeholderTextColor={colors.icon}
              returnKeyType="done"
              style={[styles.input, { color: colors.text, backgroundColor: surface }]}
            />
            <Pressable
              onPress={addTodo}
              accessibilityRole="button"
              accessibilityLabel="Add todo"
              style={[styles.addButton, { backgroundColor: tint }]}>
              <IconSymbol name="plus" size={26} color={addButtonColor} />
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </ThemedView>
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  todoTitle: {
    flex: 1,
    fontSize: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
