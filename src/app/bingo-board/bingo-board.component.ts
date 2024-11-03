import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface BingoCell {
  square: string;
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
  squares: string[] =[]
  items!: Observable<any[]>;

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.fetchBingoStrings();
  }

  fetchBingoStrings(): void {
    const bingoStringsCollection = collection(this.firestore, 'TestGame');
    this.items = collectionData(bingoStringsCollection);
    this.items.subscribe(data => {
      this.squares = data.length > 0 ? data[0]['squares'] : [];
      for (let col = 0; col < 5; col++) {
        let colSqs: string[] = [];
        colSqs[0] = this.squares[0];
        colSqs[1] = this.squares[1];
        colSqs[2] = this.squares[2];
        colSqs[3] = this.squares[3];
        colSqs[4] = this.squares[4];
        const column: BingoCell[] = colSqs.map(sq => ({square: sq, marked: false }));
        this.board.push(column);
      }
    });
  }

  toggleMark(cell: BingoCell): void {
    cell.marked = !cell.marked;

    if (this.checkForBingo()) {
      alert("Bingo! You've got BINGO!");
      // Optionally, add logic here to reset the board or end the game
    }
  }

  checkForBingo(): boolean {
    // Check rows
    for (let row = 0; row < 5; row++) {
      if (this.board.every((col) => col[row].marked)) {
        return true;
      }
    }
  
    // Check columns
    for (let col = 0; col < 5; col++) {
      if (this.board[col].every((cell) => cell.marked)) {
        return true;
      }
    }
  
    // Check diagonals
    const leftDiagonal = [0, 1, 2, 3, 4].every((i) => this.board[i][i].marked);
    const rightDiagonal = [0, 1, 2, 3, 4].every((i) => this.board[i][4 - i].marked);
  
    return leftDiagonal || rightDiagonal;
  }

}
