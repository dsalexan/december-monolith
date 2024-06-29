#include <stdio.h>

//Função para leitura do input (lê a partir do "[", e para ao encontrar "]")
void readList(int *list) {
  char c;
  int num;
  for (c = 'a'; c != '['; c = getchar());
  while (c != ']') {
    scanf(" %d", &num);
    list[num+109] = 1;
    c = getchar();
  }
}

//Função para contagem das sequências
int countSequence(int *list) {
  int i, currentSequence = 0, maxSequence = 0;
  for (i = 0; i < 218; i++) {
    if (list[i] == 1) {
      currentSequence++;
      if (currentSequence > maxSequence) maxSequence = currentSequence;
    }
    else currentSequence = 0;
  }
  return maxSequence;
}

int main(void) {
  //Vetor para acomodar os números de -109 até 109 (219 no total)
  int list[219] = {0};
  readList(list);
  printf("%d", countSequence(list));
  return 0;
}