<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    public function fetch(Request $request)
    {
        $current = $request->input('current') ? (int)$request->input('current') : 1;
        $pageSize = $request->input('page_size') ? (int)$request->input('page_size') : 5;
        $pageSize = max(1, min(20, $pageSize));

        $builder = Notice::orderBy('sort', 'ASC')
            ->orderBy('id', 'DESC')
            ->where('show', true);

        $total = $builder->count();
        $data = $builder->forPage($current, $pageSize)->get();

        return response([
            'data' => $data,
            'total' => $total
        ]);
    }
}

