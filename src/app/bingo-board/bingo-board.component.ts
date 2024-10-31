import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BingoCell {
  number: number;
  marked: boolean;
}

@Component({
  selector: 'app-bingo-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo-board.component.html',
  styleUrls: ['./bingo-board.component.css']
})
export class BingoBoardComponent implements OnInit {
  board: BingoCell[][] = [];

  constructor() {}

  ngOnInit(): void {
    this.generateBoard();
  }

  generateBoard() {
    const ranges = [
      { min: 1, max: 15 },
      { min: 16, max: 30 },
      { min: 31, max: 45 },
      { min: 46, max: 60 },
      { min: 61, max: 75 }
    ];

    this.board = [];

    for (let col = 0; col < 5; col++) {
      const columnNumbers = this.generateUniqueNumbers(ranges[col].min, ranges[col].max, 5);
      const column = columnNumbers.map(number => ({ number, marked: false }));
      this.board.push(column);
    }

    // Center "free" space at (2, 2)
    this.board[2][2] = { number: 0, marked: true };
  }

  generateUniqueNumbers(min: number, max: number, count: number): number[] {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.add(num);
    }
    return Array.from(numbers);
  }

  toggleMark(cell: BingoCell): void {
    cell.marked = !cell.marked;
  }
}
